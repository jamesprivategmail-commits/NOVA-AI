import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  classifySecurityGate,
  isInsideSandbox,
  sanitizeRepoRelativePath,
} from './securityGate';
import { createEvolutionMemory, makeExperimentFingerprint } from './evolutionMemory';
import {
  executeSandboxedExperiment,
  approveAndDeployExperiment,
  rollbackExperiment,
} from './sandboxExperimentRunner';
import type { EvolutionExperiment } from './types';

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Security Gate classifies protected operations and rejects path traversal', () => {
  const authGate = classifySecurityGate(['src/frontend/screens/AuthScreen.tsx'], 'Update login flow');
  assert.equal(authGate.requiresApproval, true);
  assert.ok(authGate.riskCategories.includes('auth_change'));
  assert.ok(authGate.riskCategories.includes('production_deploy'));

  const dbGate = classifySecurityGate(['firestore.rules', 'src/database/db.ts'], 'Database migration');
  assert.ok(dbGate.riskCategories.includes('database_migration'));

  const credGate = classifySecurityGate(['.env.example'], 'Rotate API key and secret key');
  assert.ok(credGate.riskCategories.includes('api_credentials'));

  const billingGate = classifySecurityGate(['src/frontend/screens/SubscriptionModal.tsx'], 'Update paid tier billing');
  assert.ok(billingGate.riskCategories.includes('paid_service'));

  const sandboxDir = '/tmp/nova-sandbox/exp-1';
  assert.equal(isInsideSandbox(sandboxDir, 'src/server/helper.ts'), true);
  assert.equal(isInsideSandbox(sandboxDir, '../../etc/passwd'), false);
  assert.equal(sanitizeRepoRelativePath('../secret.ts'), null);
  assert.equal(sanitizeRepoRelativePath('/src/server/ok.ts'), 'src/server/ok.ts');
});

test('EvolutionMemory deduplicates failed experiments and computes telemetry stats accurately', () => {
  const tmpDir = makeTempDir('nova-evo-mem-');
  const memFile = path.join(tmpDir, 'evolution-memory.json');
  const memory = createEvolutionMemory(memFile);

  const fp = makeExperimentFingerprint('memory', 'Hybrid RAG Ranker', ['src/server/memory/ranker.ts']);
  assert.equal(memory.hasFailedFingerprint(fp), undefined);

  memory.recordFailedExperiment({
    id: 'fail-1',
    fingerprint: fp,
    title: 'Hybrid RAG Ranker',
    area: 'memory',
    reason: 'Syntax check failed',
    lessonsLearned: 'Avoid missing exports',
    timestamp: new Date().toISOString(),
  });
  assert.equal(memory.hasFailedFingerprint(fp)?.id, 'fail-1');

  memory.recordRuntimeTelemetry({
    route: '/api/chat',
    provider: 'groq',
    model: 'qwen/qwen3.8-27b',
    latencyMs: 120,
    success: true,
  });
  memory.recordRuntimeTelemetry({
    route: '/api/chat',
    provider: 'cohere',
    model: 'command-r-plus-08-2024',
    latencyMs: 240,
    success: false,
    error: 'timeout',
  });

  const stats = memory.getRuntimeTelemetryStats();
  assert.equal(stats.totalRequests, 2);
  assert.equal(stats.successfulRequests, 1);
  assert.equal(stats.failedRequests, 1);
  assert.equal(stats.avgLatencyMs, 180);
  assert.equal(stats.errorRatePct, 50);
  assert.equal(stats.byProvider.groq.requests, 1);
  assert.equal(stats.byProvider.cohere.errors, 1);
});

test('Sandbox runner compiles valid modules, rejects broken TypeScript, and supports backup + rollback', async () => {
  const repoRoot = makeTempDir('nova-evo-repo-');
  const sandboxRoot = makeTempDir('nova-evo-sandbox-');
  const memFile = path.join(repoRoot, 'evolution-memory.json');
  const memory = createEvolutionMemory(memFile);

  // Pre-existing file in fake repoRoot so we test modify -> backup -> rollback exact restoration
  const existingRel = 'src/server/evolution/modules/sampleHelper.ts';
  const existingAbs = path.join(repoRoot, existingRel);
  fs.mkdirSync(path.dirname(existingAbs), { recursive: true });
  fs.writeFileSync(existingAbs, 'export const version = 1;\n', 'utf-8');

  // 1. Valid TypeScript experiment must pass sandbox verification & queue for approval without editing repoRoot
  const validExp: EvolutionExperiment = {
    id: 'exp-valid-1',
    cycleId: 'cycle-1',
    title: 'Upgrade sampleHelper scoring function',
    hypothesis: 'Add deterministic latency scorer',
    area: 'performance',
    targetFiles: [existingRel],
    sandboxDir: '',
    status: 'sandbox_running',
    debateTranscript: [],
    filePatches: [],
    syntaxVerified: false,
    verificationErrors: [],
    benchmark: null,
    securityGate: {
      requiresApproval: true,
      riskCategories: [],
      reasons: [],
      touchesProtectedFiles: false,
    },
    failedFingerprint: 'perf::sample-helper',
    createdAt: new Date().toISOString(),
  };

  const validResult = await executeSandboxedExperiment({
    experiment: validExp,
    candidates: [
      {
        path: existingRel,
        content: `export const version = 2;\nexport function scoreLatency(ms: number): number {\n  if (!Number.isFinite(ms) || ms <= 0) return 100;\n  return Math.max(0, Math.round(100 - ms / 25));\n}\n`,
      },
    ],
    memory,
    repoRoot,
    sandboxRoot,
  });

  assert.equal(validResult.syntaxVerified, true);
  assert.equal(validResult.status, 'passed_awaiting_approval');
  assert.ok(validResult.benchmark && validResult.benchmark.testsPassed === validResult.benchmark.testsTotal);
  // Live repo must NOT be mutated prior to user approval!
  assert.equal(fs.readFileSync(existingAbs, 'utf-8'), 'export const version = 1;\n');

  // 2. Broken TypeScript candidate must fail compilation and auto-record to failedExperiments
  const brokenExp: EvolutionExperiment = {
    ...validExp,
    id: 'exp-broken-2',
    title: 'Broken module experiment',
    failedFingerprint: 'perf::broken-module',
  };
  const brokenResult = await executeSandboxedExperiment({
    experiment: brokenExp,
    candidates: [
      {
        path: 'src/server/evolution/modules/broken.ts',
        content: 'export function broken(: void { return ===; }',
      },
    ],
    memory,
    repoRoot,
    sandboxRoot,
  });
  assert.equal(brokenResult.syntaxVerified, false);
  assert.equal(brokenResult.status, 'failed_discarded');
  assert.equal(Boolean(memory.hasFailedFingerprint('perf::broken-module')), true);

  // 3. Approve valid experiment -> writes live file & creates BackupSnapshot
  const { experiment: deployed, backup } = approveAndDeployExperiment({
    experimentId: validResult.id,
    memory,
    repoRoot,
  });
  assert.equal(deployed.status, 'approved_deployed');
  assert.ok(backup.id);
  assert.match(fs.readFileSync(existingAbs, 'utf-8'), /export const version = 2;/);

  // 4. Rollback -> restores exact pre-deployment file content
  const rolledBack = rollbackExperiment({
    experimentId: deployed.id,
    reason: 'Testing rollback restoration',
    memory,
    repoRoot,
  });
  assert.equal(rolledBack.status, 'rolled_back');
  assert.equal(fs.readFileSync(existingAbs, 'utf-8'), 'export const version = 1;\n');
});
