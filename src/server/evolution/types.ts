export type EvolutionAgentRole =
  | 'researcher'
  | 'strategist'
  | 'developer'
  | 'quality_control';

export type CapabilityStatus = 'operational' | 'degraded' | 'missing' | 'experimental';

export interface SystemCapability {
  id: string;
  name: string;
  category: 'reasoning' | 'research' | 'execution' | 'memory' | 'security' | 'resilience' | 'ui';
  status: CapabilityStatus;
  description: string;
  files: string[];
  verifiedAt: string;
}

export type WeaknessSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface WeaknessFinding {
  id: string;
  title: string;
  area: 'routing' | 'research' | 'memory' | 'execution' | 'security' | 'performance' | 'testing' | 'ui';
  severity: WeaknessSeverity;
  description: string;
  evidence: string;
  affectedFiles: string[];
  suggestedFix: string;
  detectedAt: string;
  resolved: boolean;
}

export interface TechnicalDiscovery {
  id: string;
  title: string;
  category: 'model_routing' | 'agent_architecture' | 'memory_rag' | 'benchmarking' | 'tooling' | 'optimization';
  sourceUrl: string;
  sourceTitle: string;
  summary: string;
  comparedToCurrent: string;
  actionableInsight: string;
  relevanceScore: number;
  discoveredAt: string;
}

export interface DebateTurn {
  id: string;
  agent: EvolutionAgentRole;
  stance: 'propose' | 'challenge' | 'revise' | 'support' | 'veto' | 'approve';
  message: string;
  targetAgent?: EvolutionAgentRole;
  timestamp: string;
}

export interface BenchmarkResult {
  metricName: string;
  unit: string;
  baselineLatencyMs: number;
  experimentLatencyMs: number;
  latencyDeltaPct: number;
  qualityScoreBefore: number;
  qualityScoreAfter: number;
  testsPassed: number;
  testsTotal: number;
  regressionDetected: boolean;
  summary: string;
  measuredAt: string;
}

export interface SandboxFilePatch {
  path: string;
  changeType: 'create' | 'modify';
  previousContent?: string;
  content: string;
  linesAdded: number;
  linesRemoved: number;
}

export type SecurityRiskCategory =
  | 'safe_sandbox'
  | 'production_deploy'
  | 'destructive'
  | 'database_migration'
  | 'auth_change'
  | 'security_sensitive'
  | 'paid_service'
  | 'api_credentials';

export interface SecurityGateCheck {
  requiresApproval: boolean;
  riskCategories: SecurityRiskCategory[];
  reasons: string[];
  touchesProtectedFiles: boolean;
}

export type EvolutionExperimentStatus =
  | 'sandbox_running'
  | 'passed_awaiting_approval'
  | 'failed_discarded'
  | 'approved_deployed'
  | 'rejected_by_user'
  | 'rolled_back';

export interface EvolutionExperiment {
  id: string;
  cycleId: string;
  title: string;
  hypothesis: string;
  area: WeaknessFinding['area'];
  targetFiles: string[];
  sandboxDir: string;
  status: EvolutionExperimentStatus;
  debateTranscript: DebateTurn[];
  filePatches: SandboxFilePatch[];
  syntaxVerified: boolean;
  verificationErrors: string[];
  benchmark: BenchmarkResult | null;
  securityGate: SecurityGateCheck;
  failedFingerprint: string;
  backupId?: string;
  createdAt: string;
  completedAt?: string;
  deployedAt?: string;
  rolledBackAt?: string;
  rollbackReason?: string;
}

export interface BackupSnapshot {
  id: string;
  experimentId: string;
  experimentTitle: string;
  createdAt: string;
  restoredAt?: string;
  files: Array<{
    path: string;
    existed: boolean;
    previousContent: string;
  }>;
}

export interface FailedExperimentRecord {
  id: string;
  fingerprint: string;
  title: string;
  area: string;
  reason: string;
  lessonsLearned: string;
  timestamp: string;
}

export interface SuccessfulSolutionRecord {
  id: string;
  experimentId: string;
  title: string;
  area: string;
  impactSummary: string;
  deployedFiles: string[];
  deployedAt: string;
}

export interface ArchitecturalDecision {
  id: string;
  title: string;
  rationale: string;
  cycleId: string;
  approvedBy: 'user' | 'quality_control';
  createdAt: string;
}

export interface PerformanceSnapshot {
  timestamp: string;
  avgLatencyMs: number;
  errorRatePct: number;
  capabilityCount: number;
  unresolvedWeaknesses: number;
  deployedUpgrades: number;
  discardedExperiments: number;
}

export interface SelfReflectionQA {
  question: string;
  currentAnswer: string;
  gapIdentified: string;
  priority: WeaknessSeverity;
}

export interface SchedulerConfig {
  enabled: boolean;
  intervalMinutes: number;
  researchEnabled: boolean;
  autoExperimentInSandbox: boolean;
}

export interface SchedulerState {
  running: boolean;
  currentPhase: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  totalCyclesCompleted: number;
  consecutiveIdleSkips: number;
  lastError: string | null;
}

export interface EvolutionLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'research' | 'debate' | 'experiment' | 'warning' | 'error' | 'security';
  agent: EvolutionAgentRole | 'system' | 'user';
  message: string;
  details?: string;
}

export interface RuntimeTelemetryEvent {
  route: string;
  provider: string;
  model: string;
  latencyMs: number;
  success: boolean;
  error?: string;
}

export interface RuntimeTelemetryStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRatePct: number;
  byProvider: Record<string, { requests: number; errors: number; avgLatencyMs: number }>;
  recentErrors: Array<{
    timestamp: string;
    route: string;
    provider: string;
    model: string;
    error: string;
  }>;
}

export interface EvolutionStateSnapshot {
  capabilities: SystemCapability[];
  weaknesses: WeaknessFinding[];
  discoveries: TechnicalDiscovery[];
  experiments: EvolutionExperiment[];
  pendingApprovals: EvolutionExperiment[];
  completedUpgrades: SuccessfulSolutionRecord[];
  failedExperiments: FailedExperimentRecord[];
  backups: BackupSnapshot[];
  performanceHistory: PerformanceSnapshot[];
  architecturalDecisions: ArchitecturalDecision[];
  selfReflection: SelfReflectionQA[];
  schedulerConfig: SchedulerConfig;
  schedulerState: SchedulerState;
  telemetry: RuntimeTelemetryStats;
  logs: EvolutionLogEntry[];
  lastAnalyzedAt: string | null;
  lastResearchedAt: string | null;
}
