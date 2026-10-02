export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: any;
    }>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, any>;
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  success: boolean;
  result: any;
  error?: string;
  executionTimeMs: number;
}

export interface ProjectMemory {
  projectId: string;
  projectName?: string;
  framework?: string;
  structureSnippet?: string;
  importantFiles?: string[];
  buildCommands?: string[];
  testCommands?: string[];
  previousTasks?: { task: string; timestamp: number; outcome?: string }[];
  notes?: string;
  updatedAt: number;
}
