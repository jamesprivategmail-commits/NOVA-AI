import { evolutionMemory } from './evolutionMemory.js';
import {
  runCollaborativeEvolutionCycle,
  type EvolutionKeysProvider,
} from './evolutionCouncil.js';
import type { EvolutionExperiment, SchedulerConfig } from './types.js';

export class EvolutionScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;
  private keysProvider: EvolutionKeysProvider | undefined;
  private lastTelemetryRequestCount = -1;
  private lastCycleTimestampMs = 0;

  public registerKeysProvider(provider: EvolutionKeysProvider): void {
    this.keysProvider = provider;
  }

  public start(): void {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) return;
    const cfg = evolutionMemory.getSnapshot().schedulerConfig;
    if (!cfg.enabled) {
      this.stop();
      return;
    }

    this.restartTimers(cfg);

    // Run an initial warm self-analysis + first cycle shortly after server boot if none exists yet
    if (evolutionMemory.getSnapshot().experiments.length === 0 && !this.startupTimer) {
      this.startupTimer = setTimeout(() => {
        this.startupTimer = null;
        this.tickScheduledCycle().catch((err) => {
          console.warn('[EvolutionScheduler] Initial warmup cycle warning:', err?.message || err);
        });
      }, 15_000);
      if (typeof (this.startupTimer as any).unref === 'function') {
        (this.startupTimer as any).unref();
      }
    }
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }
    evolutionMemory.schedulerState.nextRunAt = null;
  }

  public configure(patch: Partial<SchedulerConfig>): SchedulerConfig {
    const updated = evolutionMemory.updateSchedulerConfig(patch);
    evolutionMemory.addLog(
      'info',
      'system',
      `Scheduler updated: ${updated.enabled ? `enabled every ${updated.intervalMinutes}m` : 'paused'}`
    );
    if (updated.enabled) {
      this.restartTimers(updated);
    } else {
      this.stop();
    }
    return updated;
  }

  private restartTimers(cfg: SchedulerConfig): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const intervalMs = Math.max(5, cfg.intervalMinutes) * 60_000;
    evolutionMemory.schedulerState.nextRunAt = new Date(Date.now() + intervalMs).toISOString();

    this.timer = setInterval(() => {
      evolutionMemory.schedulerState.nextRunAt = new Date(Date.now() + intervalMs).toISOString();
      this.tickScheduledCycle().catch((err) => {
        evolutionMemory.schedulerState.lastError = err?.message || String(err);
      });
    }, intervalMs);

    if (typeof (this.timer as any).unref === 'function') {
      (this.timer as any).unref();
    }
  }

  private async tickScheduledCycle(): Promise<void> {
    const state = evolutionMemory.schedulerState;
    if (state.running) return;

    const snap = evolutionMemory.getSnapshot();
    if (!snap.schedulerConfig.enabled) return;

    // Resource guard: avoid repetitive idle cycles when no new telemetry/pending headroom changed
    const currentReqCount = snap.telemetry.totalRequests;
    const msSinceLastCycle = Date.now() - this.lastCycleTimestampMs;
    const hasPendingQueueSaturation = snap.pendingApprovals.length >= 4;

    if (
      this.lastCycleTimestampMs > 0 &&
      currentReqCount === this.lastTelemetryRequestCount &&
      hasPendingQueueSaturation &&
      msSinceLastCycle < 2 * 60 * 60_000
    ) {
      state.consecutiveIdleSkips += 1;
      evolutionMemory.addLog(
        'info',
        'system',
        `Skipped redundant background cycle (pending approval queue already has ${snap.pendingApprovals.length} verified experiments awaiting operator review).`
      );
      return;
    }

    await this.triggerCycle({ researchEnabled: snap.schedulerConfig.researchEnabled });
  }

  public async triggerCycle(options?: {
    customGoal?: string;
    researchEnabled?: boolean;
  }): Promise<EvolutionExperiment> {
    const state = evolutionMemory.schedulerState;
    if (state.running) {
      throw new Error('An evolution cycle is already running.');
    }

    state.running = true;
    state.lastError = null;
    state.consecutiveIdleSkips = 0;

    try {
      const result = await runCollaborativeEvolutionCycle({
        memory: evolutionMemory,
        keysProvider: this.keysProvider,
        customGoal: options?.customGoal,
        researchEnabled: options?.researchEnabled,
      });
      this.lastTelemetryRequestCount = evolutionMemory.getRuntimeTelemetryStats().totalRequests;
      this.lastCycleTimestampMs = Date.now();
      return result;
    } catch (err: any) {
      state.lastError = err?.message || String(err);
      evolutionMemory.addLog('error', 'system', `Evolution cycle failed: ${state.lastError}`);
      throw err;
    } finally {
      state.running = false;
      state.currentPhase = null;
    }
  }
}

export const evolutionScheduler = new EvolutionScheduler();
