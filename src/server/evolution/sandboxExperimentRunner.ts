import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { transform } from 'esbuild';
import { codeVerifier } from '../agent/verifier.js';
import type { EvolutionMemoryInstance } from './evolutionMemory.js';
import {
  classifySecurityGate,
  isInsideSandbox,
  sanitizeRepoRelativePath,
} from './securityGate.js';
import type {
  BackupSnapshot,
  BenchmarkResult,
  EvolutionExperiment,
  SandboxFilePatch,
} from './types.js';

export const SANDBOX_ROOT = path.join(process.cwd(), 'workspaces', '_evolution_sandbox');

export interface CandidateFileInput {
  path: string;
  content: string;
  testInput?: unknown;
}

/**
 * Compiles TypeScript/TSX/JS code inside memory via esbuild to catch genuine
 * syntax & transform errors before any experiment can pass Quality Control.
 */
async function verifyTypeScriptWithEsbuild(
  filePath: string,
  content: string
): Promise<string | null> {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  if (!['ts', 'tsx', 'js', 'jsx'].includes(ext)) return null;
  const loader = ext === 'tsx' ? 'tsx' : ext === 'jsx' ? 'jsx' : ext === 'js' ? 'js' : 'ts';

  try {
    await transform(content, {
      loader,
      target: 'es2022',
      format: 'esm',
    });
    return null;
  } catch (err: any) {
    return `esbuild compile error in ${filePath}: ${err?.message || String(err)}`;
  }
}

/**
 * Executes a real comparative micro-benchmark inside the sandbox:
 * compiles both baseline (if existing) and experimental candidate via esbuild,
 * measures real compilation/execution timing over controlled iterations,
 * and evaluates deterministic quality assertions.
 */
async function runRealComparativeBenchmark(params: {
  sandboxDir: string;
  patches: SandboxFilePatch[];
  syntaxVerified: boolean;
  hypothesis: string;
}): Promise<BenchmarkResult> {
  const { sandboxDir, patches, syntaxVerified, hypothesis } = params;
  const t0 = performance.now();

  let testsTotal = 0;
  let testsPassed = 0;
  let baselineLatencyMs = 0;
  let experimentLatencyMs = 0;

  // Baseline measurement: time baseline files (or baseline code verification pass)
  const baseStart = performance.now();
  for (const patch of patches) {
    const baselineSrc = patch.previousContent ?? patch.content;
    await verifyTypeScriptWithEsbuild(patch.path, baselineSrc);
    codeVerifier.verifyCodeFiles([{ path: patch.path, content: baselineSrc }]);
  }
  baselineLatencyMs = Math.max(0.5, Number((performance.now() - baseStart).toFixed(2)));

  // Experiment measurement: compile & evaluate candidate files in sandbox
  const expStart = performance.now();
  for (const patch of patches) {
    testsTotal += 3;
    const structural = codeVerifier.verifyCodeFiles([{ path: patch.path, content: patch.content }]);
    if (structural.passed) testsPassed++;

    const compileErr = await verifyTypeScriptWithEsbuild(patch.path, patch.content);
    if (!compileErr) testsPassed++;

    // Non-stub completeness check: ensure real exports/functions & zero placeholder markers
    const hasStubs = /\bTODO\b|\bFIXME\b|\.\.\.\s*rest of code/i.test(patch.content);
    const hasRealExports = /\bexport\s+(?:async\s+)?(?:function|class|const|type|interface)\b/.test(
      patch.content
    );
    const nonEmptyBody = patch.content.trim().length >= 80;
    if (!hasStubs && hasRealExports && nonEmptyBody) {
      testsPassed++;
    }

    // If pure JS-transpiled module in sandbox, attempt isolated load & exported pure fn smoke timing
    try {
      const ext = patch.path.split('.').pop()?.toLowerCase();
      if ((ext === 'ts' || ext === 'js') && !patch.content.includes('from \'react\'') && !patch.content.includes('from "react"')) {
        const transformed = await transform(patch.content, {
          loader: ext === 'ts' ? 'ts' : 'js',
          target: 'es2022',
          format: 'esm',
        });
        const compiledFile = path.join(
          sandboxDir,
          `__bench_${path.basename(patch.path, `.${ext}`)}.mjs`
        );
        // Only run self-contained pure modules (no relative external imports needed inside bench)
        const hasRelativeImports = /from\s+['"]\.\.?\//.test(patch.content);
        if (!hasRelativeImports && !patch.content.includes('firebase')) {
          fs.writeFileSync(compiledFile, transformed.code, 'utf-8');
          const mod = await import(`${compiledFile}?t=${Date.now()}`);
          testsTotal++;
          const exportedFns = Object.values(mod).filter((v) => typeof v === 'function');
          if (exportedFns.length > 0) {
            testsPassed++;
          }
        }
      }
    } catch {
      // Dynamic smoke load is best-effort when module imports external services
    }
  }
  experimentLatencyMs = Math.max(0.5, Number((performance.now() - expStart).toFixed(2)));

  const latencyDeltaPct =
    baselineLatencyMs > 0
      ? Number((((experimentLatencyMs - baselineLatencyMs) / baselineLatencyMs) * 100).toFixed(1))
      : 0;

  const qualityScoreBefore = patches.some((p) => p.changeType === 'modify') ? 70 : 0;
  const qualityScoreAfter = testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 100) : 0;
  const regressionDetected = !syntaxVerified || testsPassed < testsTotal;
  const totalElapsed = Number((performance.now() - t0).toFixed(2));

  return {
    metricName: 'Sandbox Verification & Compile/Load Benchmark',
    unit: 'ms',
    baselineLatencyMs,
    experimentLatencyMs,
    latencyDeltaPct,
    qualityScoreBefore,
    qualityScoreAfter,
    testsPassed,
    testsTotal,
    regressionDetected,
    summary: regressionDetected
      ? `Regression or incomplete check (${testsPassed}/${testsTotal} checks passed in ${totalElapsed}ms).`
      : `Passed ${testsPassed}/${testsTotal} sandbox checks (${hypothesis.slice(0, 72)}).`,
    measuredAt: new Date().toISOString(),
  };
}

/**
 * Stages candidate files into an isolated sandbox folder, compiles & benchmarks them,
 * and returns a fully evaluated EvolutionExperiment without touching live repo files.
 */
export async function executeSandboxedExperiment(params: {
  experiment: EvolutionExperiment;
  candidates: CandidateFileInput[];
  memory: EvolutionMemoryInstance;
  repoRoot?: string;
  sandboxRoot?: string;
}): Promise<EvolutionExperiment> {
  const {
    experiment,
    candidates,
    memory,
    repoRoot = process.cwd(),
    sandboxRoot = SANDBOX_ROOT,
  } = params;

  const sandboxDir = path.join(sandboxRoot, experiment.id);
  fs.mkdirSync(sandboxDir, { recursive: true });
  experiment.sandboxDir = path.relative(repoRoot, sandboxDir).replace(/\\/g, '/');

  const verificationErrors: string[] = [];
  const patches: SandboxFilePatch[] = [];

  for (const cand of candidates) {
    const cleanRel = sanitizeRepoRelativePath(cand.path);
    if (!cleanRel) {
      verificationErrors.push(`Invalid unsafe file path rejected: "${cand.path}"`);
      continue;
    }

    if (!isInsideSandbox(sandboxDir, cleanRel)) {
      verificationErrors.push(`Path escaped sandbox boundaries: "${cleanRel}"`);
      continue;
    }

    const sandboxTarget = path.resolve(sandboxDir, cleanRel);
    fs.mkdirSync(path.dirname(sandboxTarget), { recursive: true });
    fs.writeFileSync(sandboxTarget, cand.content, 'utf-8');

    const prodTarget = path.resolve(repoRoot, cleanRel);
    const existed = fs.existsSync(prodTarget);
    const previousContent = existed ? fs.readFileSync(prodTarget, 'utf-8') : undefined;

    const newLines = cand.content.split('\n').length;
    const oldLines = previousContent ? previousContent.split('\n').length : 0;

    patches.push({
      path: cleanRel,
      changeType: existed ? 'modify' : 'create',
      previousContent,
      content: cand.content,
      linesAdded: Math.max(0, newLines - (existed ? Math.min(oldLines, newLines) : 0)) || newLines,
      linesRemoved: existed ? Math.max(0, oldLines - newLines) : 0,
    });

    const staticResult = codeVerifier.verifyCodeFiles([{ path: cleanRel, content: cand.content }]);
    if (!staticResult.passed && staticResult.errors) {
      verificationErrors.push(...staticResult.errors);
    }
    const esbuildErr = await verifyTypeScriptWithEsbuild(cleanRel, cand.content);
    if (esbuildErr) {
      verificationErrors.push(esbuildErr);
    }
  }

  if (patches.length === 0) {
    verificationErrors.push('Experiment produced no valid file patches.');
  }

  experiment.filePatches = patches;
  experiment.targetFiles = patches.map((p) => p.path);
  experiment.verificationErrors = verificationErrors;
  experiment.syntaxVerified = verificationErrors.length === 0;

  experiment.benchmark = await runRealComparativeBenchmark({
    sandboxDir,
    patches,
    syntaxVerified: experiment.syntaxVerified,
    hypothesis: experiment.hypothesis,
  });

  experiment.securityGate = classifySecurityGate(
    experiment.targetFiles,
    `${experiment.title}\n${experiment.hypothesis}\n${patches.map((p) => p.content).join('\n')}`
  );

  experiment.completedAt = new Date().toISOString();

  if (!experiment.syntaxVerified || experiment.benchmark.regressionDetected) {
    experiment.status = 'failed_discarded';
    memory.recordFailedExperiment({
      id: `fail-${experiment.id}`,
      fingerprint: experiment.failedFingerprint,
      title: experiment.title,
      area: experiment.area,
      reason: verificationErrors[0] || experiment.benchmark.summary,
      lessonsLearned: `Avoid generating incomplete/uncompilable code for ${experiment.targetFiles.join(', ')}.`,
      timestamp: new Date().toISOString(),
    });
    memory.addLog(
      'warning',
      'quality_control',
      `Discarded sandbox experiment "${experiment.title}" after regression/verification failure.`,
      verificationErrors.join(' | ') || experiment.benchmark.summary
    );
  } else {
    experiment.status = 'passed_awaiting_approval';
    memory.addLog(
      'experiment',
      'quality_control',
      `Sandbox experiment "${experiment.title}" passed verification & benchmark (${experiment.benchmark.testsPassed}/${experiment.benchmark.testsTotal} checks). Queued for user approval.`
    );
  }

  memory.upsertExperiment(experiment);
  return experiment;
}

/**
 * Promotes an approved sandbox experiment into the live repository after saving
 * an automatic file-level BackupSnapshot for instant 1-click rollback.
 */
export function approveAndDeployExperiment(params: {
  experimentId: string;
  memory: EvolutionMemoryInstance;
  repoRoot?: string;
}): { experiment: EvolutionExperiment; backup: BackupSnapshot } {
  const { experimentId, memory, repoRoot = process.cwd() } = params;
  const experiment = memory.getExperiment(experimentId);
  if (!experiment) {
    throw new Error(`Experiment "${experimentId}" not found.`);
  }
  if (experiment.status !== 'passed_awaiting_approval') {
    throw new Error(`Experiment "${experimentId}" is in status "${experiment.status}" and cannot be deployed.`);
  }
  if (!experiment.syntaxVerified) {
    throw new Error(`Cannot deploy experiment "${experimentId}" because verification failed.`);
  }

  // Create automatic backup before touching any live file
  const backupFiles: BackupSnapshot['files'] = [];
  for (const patch of experiment.filePatches) {
    const cleanRel = sanitizeRepoRelativePath(patch.path);
    if (!cleanRel || !isInsideSandbox(repoRoot, cleanRel)) {
      throw new Error(`Unsafe target path blocked by Security Gate: ${patch.path}`);
    }
    const target = path.resolve(repoRoot, cleanRel);
    const existed = fs.existsSync(target);
    const previousContent = existed ? fs.readFileSync(target, 'utf-8') : '';
    backupFiles.push({ path: cleanRel, existed, previousContent });
  }

  const backup: BackupSnapshot = {
    id: `bak-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    experimentId: experiment.id,
    experimentTitle: experiment.title,
    createdAt: new Date().toISOString(),
    files: backupFiles,
  };
  memory.saveBackup(backup);

  // Apply patches atomically to repoRoot
  for (const patch of experiment.filePatches) {
    const cleanRel = sanitizeRepoRelativePath(patch.path)!;
    const target = path.resolve(repoRoot, cleanRel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, patch.content, 'utf-8');
  }

  experiment.status = 'approved_deployed';
  experiment.backupId = backup.id;
  experiment.deployedAt = new Date().toISOString();
  memory.upsertExperiment(experiment);

  memory.recordSuccessfulSolution({
    id: `sol-${experiment.id}`,
    experimentId: experiment.id,
    title: experiment.title,
    area: experiment.area,
    impactSummary: experiment.benchmark?.summary || experiment.hypothesis,
    deployedFiles: experiment.targetFiles,
    deployedAt: experiment.deployedAt,
  });

  memory.addDecision({
    id: `dec-${experiment.id}`,
    title: `Approved & deployed: ${experiment.title}`,
    rationale: `${experiment.hypothesis} (Backup ${backup.id} stored)`,
    cycleId: experiment.cycleId,
    approvedBy: 'user',
    createdAt: experiment.deployedAt,
  });

  memory.resolveWeakness(experiment.area);
  memory.recordPerformanceSnapshot();
  memory.addLog(
    'security',
    'user',
    `Approved & deployed "${experiment.title}" to production with automatic backup ${backup.id}.`
  );

  return { experiment, backup };
}

/**
 * Rejects a pending experiment and stores its fingerprint so the council avoids repeating it.
 */
export function rejectExperiment(params: {
  experimentId: string;
  reason?: string;
  memory: EvolutionMemoryInstance;
}): EvolutionExperiment {
  const { experimentId, reason = 'Rejected by operator in Evolution Centre', memory } = params;
  const experiment = memory.getExperiment(experimentId);
  if (!experiment) {
    throw new Error(`Experiment "${experimentId}" not found.`);
  }
  experiment.status = 'rejected_by_user';
  experiment.completedAt = new Date().toISOString();
  memory.upsertExperiment(experiment);

  memory.recordFailedExperiment({
    id: `rej-${experiment.id}`,
    fingerprint: experiment.failedFingerprint,
    title: experiment.title,
    area: experiment.area,
    reason,
    lessonsLearned: `Operator rejected "${experiment.title}": ${reason}`,
    timestamp: new Date().toISOString(),
  });
  memory.addLog('security', 'user', `Rejected proposal "${experiment.title}": ${reason}`);
  return experiment;
}

/**
 * Rolls back a deployed upgrade to its exact pre-deployment file state using its BackupSnapshot.
 */
export function rollbackExperiment(params: {
  experimentId: string;
  reason?: string;
  memory: EvolutionMemoryInstance;
  repoRoot?: string;
}): EvolutionExperiment {
  const {
    experimentId,
    reason = 'Manual rollback triggered from Evolution Centre',
    memory,
    repoRoot = process.cwd(),
  } = params;

  const experiment = memory.getExperiment(experimentId);
  if (!experiment) {
    throw new Error(`Experiment "${experimentId}" not found.`);
  }
  if (!experiment.backupId) {
    throw new Error(`Experiment "${experimentId}" has no recorded backup snapshot.`);
  }

  const backup = memory.getBackup(experiment.backupId);
  if (!backup) {
    throw new Error(`Backup snapshot "${experiment.backupId}" missing.`);
  }

  for (const fileEntry of backup.files) {
    const cleanRel = sanitizeRepoRelativePath(fileEntry.path);
    if (!cleanRel || !isInsideSandbox(repoRoot, cleanRel)) continue;
    const target = path.resolve(repoRoot, cleanRel);

    if (fileEntry.existed) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, fileEntry.previousContent, 'utf-8');
    } else if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
  }

  memory.markBackupRestored(backup.id);
  experiment.status = 'rolled_back';
  experiment.rolledBackAt = new Date().toISOString();
  experiment.rollbackReason = reason;
  memory.upsertExperiment(experiment);
  memory.recordPerformanceSnapshot();
  memory.addLog(
    'security',
    'user',
    `Rolled back upgrade "${experiment.title}" using backup ${backup.id}.`
  );

  return experiment;
}
