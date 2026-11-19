import fs from 'fs';
import path from 'path';
import { commitRepoFile, getRepoFile } from '../github.js';
import { evolutionMemory } from './evolutionMemory.js';
import { runAutonomousWebResearch } from './internetResearcher.js';
import {
  approveAndDeployExperiment,
  rejectExperiment,
  rollbackExperiment,
} from './sandboxExperimentRunner.js';
import { runArchitectureSelfAnalysis } from './selfAnalyzer.js';
import { evolutionScheduler } from './evolutionScheduler.js';
import type { EvolutionKeysProvider } from './evolutionCouncil.js';
import type {
  EvolutionExperiment,
  EvolutionStateSnapshot,
  RuntimeTelemetryEvent,
  SchedulerConfig,
} from './types.js';

export type ProposalArea = 'ui' | 'brain' | 'security' | 'connectors' | 'accessibility' | 'performance';
export type ProposalChangeType = 'create' | 'patch';
export type ProposalStatus = 'pending' | 'committed' | 'failed';

export interface ProposalPatch {
  anchor: string;
  replacement: string;
}

export interface EvolutionProposal {
  id: string;
  area: ProposalArea;
  title: string;
  description: string;
  file: string;
  changeType: ProposalChangeType;
  patch?: ProposalPatch;
  content?: string;
  createdAt: string;
  status: ProposalStatus;
  commitSha?: string;
  error?: string;
  htmlUrl?: string;
}

export interface EvolutionStats {
  total: number;
  committed: number;
  failed: number;
  lastCommit: string | null;
}

export interface ApplyOptions {
  owner: string;
  repo: string;
  branch: string;
}

const HISTORY_FILE = path.join(process.cwd(), 'src', 'server', 'evolution', 'history.json');

function loadLegacyHistory(): EvolutionProposal[] {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let legacyHistory: EvolutionProposal[] = loadLegacyHistory();

function saveLegacyHistory() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(legacyHistory.slice(-200), null, 2), 'utf-8');
  } catch {
    // non-fatal
  }
}

export class EvolutionEngine {
  public registerKeyProvider(provider: EvolutionKeysProvider): void {
    evolutionScheduler.registerKeysProvider(provider);
  }

  public startScheduler(): void {
    evolutionScheduler.start();
  }

  public recordTelemetry(evt: RuntimeTelemetryEvent): void {
    evolutionMemory.recordRuntimeTelemetry(evt);
  }

  public getFullState(): EvolutionStateSnapshot {
    const snap = evolutionMemory.getSnapshot();
    if (snap.capabilities.length === 0 && !snap.lastAnalyzedAt) {
      runArchitectureSelfAnalysis(evolutionMemory);
      return evolutionMemory.getSnapshot();
    }
    return snap;
  }

  public runAnalysis() {
    return runArchitectureSelfAnalysis(evolutionMemory);
  }

  public async runResearch(customQuery?: string) {
    const state = this.getFullState();
    return runAutonomousWebResearch(evolutionMemory, state.capabilities, customQuery);
  }

  public async runEvolutionCycle(options?: {
    customGoal?: string;
    researchEnabled?: boolean;
  }): Promise<EvolutionExperiment> {
    return evolutionScheduler.triggerCycle(options);
  }

  public updateScheduler(patch: Partial<SchedulerConfig>): SchedulerConfig {
    return evolutionScheduler.configure(patch);
  }

  public approveExperiment(experimentId: string) {
    return approveAndDeployExperiment({
      experimentId,
      memory: evolutionMemory,
    });
  }

  public rejectExperiment(experimentId: string, reason?: string) {
    return rejectExperiment({
      experimentId,
      reason,
      memory: evolutionMemory,
    });
  }

  public rollbackExperiment(experimentId: string, reason?: string) {
    return rollbackExperiment({
      experimentId,
      reason,
      memory: evolutionMemory,
    });
  }

  // ── Backward-compatible proposal API preserved for existing callers ──
  public generateProposal(idea?: string, area: ProposalArea = 'ui', file?: string): EvolutionProposal {
    const cleanIdea = (idea || 'Self-evolution optimization check').trim();
    const slug =
      cleanIdea
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'upgrade';
    const proposal: EvolutionProposal = {
      id: `evo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      area,
      title: cleanIdea.slice(0, 80),
      description: cleanIdea,
      file: file || `src/server/evolution/modules/${slug}.ts`,
      changeType: 'create',
      content: `export const upgradeNote = ${JSON.stringify(cleanIdea)};\nexport const createdAt = ${JSON.stringify(new Date().toISOString())};\n`,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    legacyHistory.push(proposal);
    saveLegacyHistory();
    return proposal;
  }

  public async applyProposal(
    proposalOrId: EvolutionProposal | string,
    token: string,
    options: ApplyOptions
  ): Promise<EvolutionProposal> {
    const proposal =
      typeof proposalOrId === 'string'
        ? legacyHistory.find((p) => p.id === proposalOrId)
        : proposalOrId;
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    const { owner, repo, branch } = options;
    const commitMessage = `[evolution] ${proposal.title} (${proposal.area})`;

    try {
      let content: string;
      let fileSha: string | undefined;

      if (proposal.changeType === 'patch') {
        if (!proposal.patch) throw new Error('Patch proposal is missing anchored replacement');
        const existing = await getRepoFile(token, owner, repo, proposal.file, branch);
        const occurrences = existing.content.split(proposal.patch.anchor).length - 1;
        if (occurrences !== 1) {
          throw new Error(`Anchor found ${occurrences} times in ${proposal.file}; expected once`);
        }
        content = existing.content.replace(proposal.patch.anchor, proposal.patch.replacement);
        fileSha = existing.sha;
      } else {
        if (!proposal.content) throw new Error('Create proposal is missing content');
        content = proposal.content;
      }

      const result = await commitRepoFile(
        token,
        owner,
        repo,
        proposal.file,
        content,
        commitMessage,
        branch,
        fileSha
      );
      proposal.status = 'committed';
      proposal.commitSha = result.commit?.sha || result.commit?.id || undefined;
      proposal.htmlUrl = result.htmlUrl;
    } catch (err: any) {
      proposal.status = 'failed';
      proposal.error = err?.message || String(err);
    }

    const idx = legacyHistory.findIndex((p) => p.id === proposal.id);
    if (idx >= 0) legacyHistory[idx] = proposal;
    else legacyHistory.push(proposal);
    saveLegacyHistory();
    return proposal;
  }

  public listProposals(): EvolutionProposal[] {
    return [...legacyHistory];
  }

  public getEvolutionStats(): EvolutionStats {
    const snap = this.getFullState();
    const committed = legacyHistory.filter((p) => p.status === 'committed');
    const last = committed.length > 0 ? committed[committed.length - 1] : null;
    return {
      total: legacyHistory.length + snap.experiments.length,
      committed: committed.length + snap.completedUpgrades.length,
      failed: legacyHistory.filter((p) => p.status === 'failed').length + snap.failedExperiments.length,
      lastCommit: snap.completedUpgrades[0]?.deployedAt || (last ? last.createdAt : null),
    };
  }
}

export const evolutionEngine = new EvolutionEngine();
