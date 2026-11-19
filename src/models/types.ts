export interface UserApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  createdAt: number;
  lastUsedAt?: number;
}

export type UserTier = 'free' | 'pro' | 'premium' | 'vip';

export interface PricingSettings {
  // Account Subscriptions (Monthly, Yearly, Discount %)
  pro: number;
  proYearly?: number;
  proDiscount?: number;

  premium: number;
  premiumYearly?: number;
  premiumDiscount?: number;

  vip: number;
  vipYearly?: number;
  vipDiscount?: number;

  // Separate Developer API Key Pricing (Per Month, Per Year, Discount %)
  apiKeyMonthly?: number;
  apiKeyYearly?: number;
  apiKeyDiscount?: number;
}

export interface SystemAPIKeys {
  groqApiKey?: string;
  groqApiKeys?: string[];
  cohereApiKey?: string;
  cohereApiKeys?: string[];
  bazaarLinkApiKey?: string;
  bazaarLinkApiKeys?: string[];
  geminiApiKey?: string;
  geminiApiKeys?: string[];
  googleApiKey?: string;
  telegramBotToken?: string;
}

export interface AIBrainSettings {
  globalPrompt: string;
  freePrompt: string;
  proPrompt: string;
  premiumPrompt: string;
  vipPrompt: string;

  freeLimit: number;
  proLimit: number;
  premiumLimit: number;
  vipLimit: number;

  freeMaxTokens: number;
  proMaxTokens: number;
  premiumMaxTokens: number;
  vipMaxTokens: number;
}


export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  tier: UserTier;
  messageCount: number;
  lastMessageDate: string; // "YYYY-MM-DD"
  lastResetTime?: number; // timestamp in ms for 2-hour reset window
  isAdmin: boolean;
  isSupportStaff?: boolean;
  isBanned?: boolean;
  isVerified?: boolean;
  walletBalance?: number;
  hasApiKeyAccess?: boolean;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  amount: number; // Positive for credit, negative for debit/purchase
  type: 'admin_grant' | 'subscription_purchase' | 'apikey_purchase' | 'refund';
  description: string;
  createdAt: number;
}

export interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  senderName: string;
  targetTier?: 'all' | UserTier;
  createdAt: number;
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
  folder?: string;
  tags?: string[];
  customSystemPrompt?: string;
}

export type ToolEventType = 'terminal' | 'editor' | 'github' | 'git' | 'browser' | 'tests' | 'build';
export type ToolEventStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface BaseToolEvent {
  id: string;
  type: 'tool';
  tool: ToolEventType;
  status: ToolEventStatus;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  exitCode?: number;
}

export interface TerminalToolEvent extends BaseToolEvent {
  tool: 'terminal';
  command: string;
  cwd?: string;
  output: string;
  args?: string[];
  pid?: number;
}

export interface EditorToolEvent extends BaseToolEvent {
  tool: 'editor';
  action: 'create' | 'edit' | 'delete' | 'view';
  filePath: string;
  additions?: number;
  deletions?: number;
  diff?: string;
  originalContent?: string;
  newContent?: string;
  summary?: string;
}

export interface GitHubToolEvent extends BaseToolEvent {
  tool: 'github';
  operation: 'read' | 'commit' | 'branch' | 'pr' | 'search';
  repo: string;
  target?: string;
  commitSha?: string;
  commitMessage?: string;
  branch?: string;
  detail?: string;
}

export interface BuildOrTestToolEvent extends BaseToolEvent {
  tool: 'build' | 'tests';
  command: string;
  output: string;
  testsPassed?: number;
  testsFailed?: number;
  testsTotal?: number;
  summary?: string;
}

export interface GenericToolEvent extends BaseToolEvent {
  tool: 'git' | 'browser';
  command?: string;
  output?: string;
  url?: string;
  detail?: string;
}

export type AgentState =
  | 'idle'
  | 'thinking'
  | 'using_tool'
  | 'waiting_for_approval'
  | 'running'
  | 'completed'
  | 'failed';

export type WorkspaceTab = 'chat' | 'workspace' | 'terminal';

export interface ActivityTimelineStep {
  id: string;
  label: string;
  status: 'completed' | 'in_progress' | 'pending' | 'failed';
  detail?: string;
}

export type StructuredToolEvent =
  | TerminalToolEvent
  | EditorToolEvent
  | GitHubToolEvent
  | BuildOrTestToolEvent
  | GenericToolEvent;

export interface WebResearchSource {
  url: string;
  title: string;
  snippet: string;
  section?: string;
  wordCount?: number;
  isSubpage?: boolean;
}

export interface CouncilAgentDiscussion {
  agentId: string;
  agentName: string;
  role: string;
  provider: string;
  modelUsed: string;
  analysis: string;
  proposedSubtask?: string;
  durationMs: number;
  status: 'thinking' | 'completed' | 'error';
}

export interface CouncilWorkerTask {
  agentId: string;
  agentName: string;
  role: string;
  taskTitle: string;
  instruction: string;
  provider: string;
  modelUsed: string;
  output: string;
  durationMs: number;
  status: 'pending' | 'running' | 'completed' | 'error';
}

export interface CouncilData {
  phase: 'research' | 'discussion' | 'work' | 'synthesis' | 'done';
  squadMemberIds: string[];
  webSources?: WebResearchSource[];
  totalPagesRead?: number;
  discussions?: CouncilAgentDiscussion[];
  tasks?: CouncilWorkerTask[];
  leadAgentName?: string;
  totalDurationMs?: number;
}

export type ArtifactKind =
  | 'html'
  | 'css'
  | 'javascript'
  | 'react'
  | 'typescript'
  | 'json'
  | 'text'
  | 'markdown'
  | 'pdf'
  | 'csv'
  | 'xlsx'
  | 'docx'
  | 'image'
  | 'svg'
  | 'zip'
  | 'code';

export interface ArtifactZipEntryInfo {
  path: string;
  name: string;
  size: number;
  isText: boolean;
}

export interface ArtifactRecord {
  id: string;
  filename: string;
  path: string;
  mimeType: string;
  extension: string;
  kind: ArtifactKind;
  size: number;
  content?: string;
  base64Data?: string;
  isBinary?: boolean;
  storageRef: string;
  downloadUrl: string;
  previewUrl?: string;
  createdAt: number;
  updatedAt?: number;
  conversationId: string;
  messageId?: string;
  userId: string;
  groupId?: string;
  projectName?: string;
  title?: string;
  description?: string;
  sourceProjectId?: string;
  fileCount?: number;
  zipEntries?: ArtifactZipEntryInfo[];
  modifiedFiles?: string[];
  preservedFiles?: string[];
  extractedPreview?: string;
}

export interface MessageAttachmentMeta {
  id: string;
  artifactId?: string;
  projectId?: string;
  kind: 'image' | 'file' | 'zip';
  name: string;
  extension: string;
  mimeType: string;
  size: number;
  fileCount?: number;
  downloadUrl?: string;
  previewUrl?: string;
  extractedPreview?: string;
}

export interface ProjectGroupInfo {
  groupId: string;
  projectName: string;
  sourceProjectId?: string;
  zipArtifactId?: string;
  zipFilename?: string;
  zipSize?: number;
  fileCount: number;
  artifactIds: string[];
  modifiedFiles?: string[];
  preservedFiles?: string[];
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'model';
  text: string;
  createdAt: number;
  thinking?: string;
  toolEvents?: StructuredToolEvent[];
  councilData?: CouncilData;
  isToolEvent?: boolean;
  latencyMs?: number;
  ttftMs?: number;
  tokensPerSec?: number;
  totalTokens?: number;
  modelUsed?: string;
  providerUsed?: string;
  isStarred?: boolean;
  artifacts?: ArtifactRecord[];
  attachments?: MessageAttachmentMeta[];
  projectGroup?: ProjectGroupInfo;
}

export interface ExecutionGraphStep {
  id: string;
  phase: 'intent' | 'scan' | 'edit' | 'verify' | 'commit';
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  detail?: string;
  substeps?: string[];
}

export interface SupportMessage {
  id: string;
  senderId: string; // uid of user or 'admin'
  isAdmin: boolean;
  text: string;
  createdAt: number;
}

export interface SupportChat {
  id: string; // same as userId
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadAdmin: number;
  unreadUser: number;
}

export interface WorkspaceFileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: number;
  extension?: string;
  children?: WorkspaceFileInfo[];
}

export interface ManagedProcess {
  id: string;
  userId: string;
  name: string;
  command: string;
  pid: number;
  startedAt: number;
  status: 'running' | 'stopped' | 'failed';
  port?: number;
  previewUrl?: string;
  lastLog?: string;
}

export interface AutonomousExecutionStep {
  stepNumber: number;
  action: string;
  command?: string;
  path?: string;
  status: 'running' | 'success' | 'error';
  output?: string;
  exitCode?: number;
  durationMs?: number;
}

