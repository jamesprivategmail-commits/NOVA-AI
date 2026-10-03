export type {
  ToolEventType,
  ToolEventStatus,
  BaseToolEvent,
  TerminalToolEvent,
  EditorToolEvent,
  GitHubToolEvent,
  BuildOrTestToolEvent,
  GenericToolEvent,
  StructuredToolEvent,
} from '../../models/types';

export type AgentExecutionState =
  | 'planning'
  | 'inspecting'
  | 'editing'
  | 'running'
  | 'fixing'
  | 'completed'
  | 'failed'
  | 'waiting_for_user';

export type WorkflowPhase =
  | 'UNDERSTAND'
  | 'PLAN'
  | 'INSPECT'
  | 'EXECUTE'
  | 'VERIFY'
  | 'FIX'
  | 'REPORT';

export interface ToolActionRecord {
  id: string;
  tool: string;
  action: string;
  phase: WorkflowPhase;
  status: 'running' | 'success' | 'error';
  detail?: string;
  timestamp: number;
}

export interface VerificationResult {
  passed: boolean;
  errors?: string[];
  warnings?: string[];
  message?: string;
  attempt?: number;
  maxAttempts?: number;
}

export interface ProjectMemory {
  projectId: string;
  projectName?: string;
  framework?: string;
  language?: string;
  packageManager?: string;
  entryPoints?: string[];
  importantDirectories?: string[];
  authArchitecture?: string;
  databaseStructure?: string;
  apiStructure?: string;
  deploymentConfig?: string;
  codingConventions?: string;
  previousDecisions?: string[];
  knownIssues?: string[];
  userApprovedInstructions?: string;
  updatedAt: number;
}

export interface ToolCapabilityStatus {
  name: string;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'CONNECTED' | 'DISCONNECTED';
  description: string;
  details?: Record<string, any>;
}

export interface AgentActivityPayload {
  task: string;
  state: AgentExecutionState;
  phase: WorkflowPhase;
  steps: string[];
  actions?: ToolActionRecord[];
  changedFiles: string[];
  summary?: string;
  verification?: VerificationResult;
  filesData?: { path: string; content: string }[];
  activeFile?: string;
}
