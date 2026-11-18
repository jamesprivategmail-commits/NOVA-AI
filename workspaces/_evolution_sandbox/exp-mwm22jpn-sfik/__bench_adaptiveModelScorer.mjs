class AdaptiveModelScorer {
  metrics = /* @__PURE__ */ new Map();
  alpha = 0.25;
  makeKey(provider, model) {
    return `${provider}::${model}`;
  }
  record(sample) {
    const key = this.makeKey(sample.provider, sample.model);
    const prev = this.metrics.get(key) || {
      emaLatencyMs: 1200,
      successEma: 0.9,
      samples: 0,
      consecutiveFailures: 0,
      lastUpdatedAt: sample.recordedAt
    };
    const clampedLatency = Math.max(25, Math.min(6e4, sample.latencyMs || 1200));
    const emaLatencyMs = prev.samples === 0 ? clampedLatency : prev.emaLatencyMs * (1 - this.alpha) + clampedLatency * this.alpha;
    const successVal = sample.success ? 1 : 0;
    const successEma = prev.samples === 0 ? successVal : prev.successEma * (1 - this.alpha) + successVal * this.alpha;
    this.metrics.set(key, {
      emaLatencyMs: Math.round(emaLatencyMs),
      successEma: Number(successEma.toFixed(4)),
      samples: prev.samples + 1,
      consecutiveFailures: sample.success ? 0 : prev.consecutiveFailures + 1,
      lastUpdatedAt: sample.recordedAt
    });
  }
  scoreCandidate(provider, model, nowMs = Date.now()) {
    const m = this.metrics.get(this.makeKey(provider, model));
    if (!m) return 85;
    const elapsedMs = Math.max(0, nowMs - m.lastUpdatedAt);
    const penaltyActive = m.consecutiveFailures > 0 && elapsedMs < 3e5;
    const failurePenalty = penaltyActive ? Math.min(60, m.consecutiveFailures * 18) : 0;
    const speedScore = Math.max(0, 40 - m.emaLatencyMs / 250);
    const reliabilityScore = m.successEma * 60;
    return Number(Math.max(1, reliabilityScore + speedScore - failurePenalty).toFixed(2));
  }
  rankCandidates(candidates) {
    const now = Date.now();
    return [...candidates].sort(
      (a, b) => this.scoreCandidate(b.provider, b.model, now) - this.scoreCandidate(a.provider, a.model, now)
    );
  }
}
export {
  AdaptiveModelScorer
};
