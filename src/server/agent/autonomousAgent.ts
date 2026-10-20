import express from 'express';
import { Groq } from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import { CohereClient } from 'cohere-ai';
import { terminalService } from '../terminal/terminalService';
import { workspaceService } from '../workspace/workspaceService';
import { processManager } from '../process/processManager';
import { AI_CONFIG } from '../../config/ai';

export interface AutonomousAgentOptions {
  userId: string;
  messages: any[];
  systemPrompt: string;
  maxTokens: number;
  provider: string;
  model?: string;
  keys: {
    groqKeys: string[];
    geminiKeys: string[];
    cohereKeys: string[];
    bazaarLinkKeys: string[];
  };
  res: express.Response;
  maxSteps?: number;
}

export class AutonomousAgentEngine {
  /**
   * Run multi-step autonomous tool execution loop
   */
  public async runAutonomousLoop(options: AutonomousAgentOptions): Promise<boolean> {
    const {
      userId,
      messages,
      systemPrompt,
      maxTokens,
      provider,
      model,
      keys,
      res,
      maxSteps = 6,
    } = options;

    const autonomousSystemPrompt = `${systemPrompt}

[AUTONOMOUS AGENT CAPABILITIES - REAL LINUX WORKSPACE EXECUTION]:
You are NOVA AI, an elite autonomous development and automation agent equipped with a REAL Linux terminal, persistent workspace, and process manager.
When the user asks you to write code, install packages, build apps, run Python/Node scripts, debug errors, manage Git, start servers, or automate workflows:
YOU MUST EXECUTE REAL ACTIONS. Do NOT merely suggest commands for the user to copy/paste.

To invoke a tool, output a single JSON block inside \`\`\`void-tool-call:
\`\`\`void-tool-call
{
  "action": "execute_command",
  "command": "npm install lodash",
  "thought": "Installing required lodash package"
}
\`\`\`

AVAILABLE AUTONOMOUS TOOLS:
1. "execute_command": { "action": "execute_command", "command": string, "thought"?: string }
   Executes a bash/sh command in the user's workspace (/workspaces/${userId || 'default'}).
   Returns real stdout, stderr, and exitCode.
2. "write_file": { "action": "write_file", "path": string, "content": string, "thought"?: string }
   Creates or updates a file in the persistent workspace.
3. "read_file": { "action": "read_file", "path": string, "thought"?: string }
   Reads file content from the persistent workspace.
4. "list_files": { "action": "list_files", "path"?: string, "thought"?: string }
   Lists directory contents and file structure in the workspace.
5. "delete_file": { "action": "delete_file", "path": string, "thought"?: string }
   Deletes a file or directory from the workspace.
6. "start_process": { "action": "start_process", "command": string, "name"?: string, "port"?: number, "thought"?: string }
   Launches a persistent background server or daemon process. If a port is used, Nova generates a live temporary HTTPS preview link: /api/preview/<port>/
7. "stop_process": { "action": "stop_process", "id": string, "thought"?: string }
   Stops a background task.
8. "list_processes": { "action": "list_processes", "thought"?: string }
   Lists all running background jobs, servers, and active preview links.

AUTONOMOUS EXECUTION & SELF-CORRECTION PRINCIPLES:
- The system feeds real tool output back to you immediately.
- If a command fails or throws an error (e.g., missing package, syntax error, port in use):
  1. Inspect the real error trace and exit code.
  2. Formulate a fix (e.g., install missing library, edit file, modify config).
  3. Re-run the verification command.
  4. Only declare success after verifying the real output.
- When you do NOT need any further tools, conclude with a clear, concise summary of the result and any preview links.`;

    let currentMessages = [...messages];
    let step = 0;

    while (step < maxSteps) {
      step++;
      let stepResponseText = '';

      // Collect LLM completion for this step
      const stepSuccess = await this.generateStepCompletion({
        messages: currentMessages,
        systemPrompt: autonomousSystemPrompt,
        maxTokens,
        provider,
        model,
        keys,
        onChunk: (chunk: string) => {
          stepResponseText += chunk;
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        },
      });

      if (!stepSuccess) {
        return false;
      }

      // Check if the LLM requested a tool execution
      const toolCall = this.parseToolCall(stepResponseText);
      if (!toolCall) {
        // No tool call produced; the agent has answered or finished its workflow
        return true;
      }

      // Execute tool call in real workspace
      const toolResult = await this.executeTool(userId, toolCall, res);

      // Append assistant's call and system's execution result back into conversation history
      currentMessages.push({
        role: 'assistant',
        content: stepResponseText,
      });

      currentMessages.push({
        role: 'user',
        content: `[SYSTEM TOOL EXECUTION RESULT: ${toolCall.action} (Exit: ${toolResult.exitCode ?? 0})]\n${toolResult.output}`,
      });

      // Stream a newline transition
      res.write(`data: ${JSON.stringify({ text: '\n\n' })}\n\n`);
    }

    return true;
  }

  /**
   * Parse ```void-tool-call or ```tool-call block
   */
  private parseToolCall(text: string): { action: string; [key: string]: any } | null {
    const match = text.match(/```(?:void-tool-call|tool-call)\s*([\s\S]*?)```/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed && typeof parsed.action === 'string') {
        return parsed;
      }
    } catch (_) {}
    return null;
  }

  /**
   * Execute real tool and stream structured tool events
   */
  private async executeTool(
    userId: string,
    toolCall: { action: string; [key: string]: any },
    res: express.Response
  ): Promise<{ exitCode: number; output: string }> {
    const startTime = Date.now();
    const eventId = `tool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    switch (toolCall.action) {
      case 'execute_command': {
        const command = String(toolCall.command || '').trim();
        if (!command) return { exitCode: 1, output: 'Error: No command provided' };

        // Send tool-event running notification
        const startEvent = {
          id: eventId,
          type: 'tool',
          tool: 'terminal',
          status: 'running',
          command,
          output: '',
          startedAt: startTime,
        };
        res.write(`data: ${JSON.stringify({ text: `\n\`\`\`void-tool-event\n${JSON.stringify(startEvent)}\n\`\`\`\n` })}\n\n`);

        const runner = terminalService.runCommand(command, {
          userId,
          timeoutMs: 60000,
        });

        const completed = await runner.promise;
        const durationMs = Date.now() - startTime;

        // Send completed tool event
        const doneEvent = {
          id: eventId,
          type: 'tool',
          tool: 'terminal',
          status: completed.exitCode === 0 ? 'completed' : 'failed',
          command,
          output: completed.output || (completed.exitCode === 0 ? 'Command finished with no output.' : 'Command exited with error.'),
          startedAt: startTime,
          completedAt: Date.now(),
          durationMs,
          exitCode: completed.exitCode ?? 0,
        };
        res.write(`data: ${JSON.stringify({ text: `\n\`\`\`void-tool-event\n${JSON.stringify(doneEvent)}\n\`\`\`\n` })}\n\n`);

        return {
          exitCode: completed.exitCode ?? 0,
          output: completed.output || '(No output produced)',
        };
      }

      case 'write_file': {
        const filePath = String(toolCall.path || '').trim();
        const content = String(toolCall.content ?? '');
        try {
          await workspaceService.writeFile(userId, filePath, content);
          const addCount = content.split('\n').length;

          const editorEvent = {
            id: eventId,
            type: 'tool',
            tool: 'editor',
            status: 'completed',
            action: 'create',
            filePath,
            additions: addCount,
            deletions: 0,
            summary: `Created ${filePath} (${addCount} lines)`,
            startedAt: startTime,
            completedAt: Date.now(),
            durationMs: Date.now() - startTime,
          };
          res.write(`data: ${JSON.stringify({ text: `\n\`\`\`void-tool-event\n${JSON.stringify(editorEvent)}\n\`\`\`\n` })}\n\n`);

          return {
            exitCode: 0,
            output: `Successfully wrote file ${filePath} (${content.length} bytes, ${addCount} lines).`,
          };
        } catch (err: any) {
          return { exitCode: 1, output: `Failed to write file ${filePath}: ${err.message}` };
        }
      }

      case 'read_file': {
        const filePath = String(toolCall.path || '').trim();
        try {
          const content = await workspaceService.readFile(userId, filePath);
          return { exitCode: 0, output: `[File Content of ${filePath}]:\n${content}` };
        } catch (err: any) {
          return { exitCode: 1, output: `Failed to read file ${filePath}: ${err.message}` };
        }
      }

      case 'list_files': {
        const dirPath = String(toolCall.path || '').trim();
        try {
          const files = await workspaceService.listFiles(userId, dirPath);
          const formatted = files.map(f => `${f.isDirectory ? '📁' : '📄'} ${f.path} ${f.size ? `(${f.size} B)` : ''}`).join('\n');
          return { exitCode: 0, output: `[Files in workspace]:\n${formatted || '(Workspace empty)'}` };
        } catch (err: any) {
          return { exitCode: 1, output: `Failed to list files: ${err.message}` };
        }
      }

      case 'delete_file': {
        const filePath = String(toolCall.path || '').trim();
        try {
          const deleted = await workspaceService.deleteFile(userId, filePath);
          return { exitCode: 0, output: deleted ? `Deleted ${filePath}.` : `File not found: ${filePath}` };
        } catch (err: any) {
          return { exitCode: 1, output: `Failed to delete file ${filePath}: ${err.message}` };
        }
      }

      case 'start_process': {
        const command = String(toolCall.command || '').trim();
        const name = toolCall.name ? String(toolCall.name) : undefined;
        const port = toolCall.port ? Number(toolCall.port) : undefined;

        try {
          const proc = processManager.startProcess({
            userId,
            command,
            name,
            port,
          });

          const procEvent = {
            id: eventId,
            type: 'tool',
            tool: 'terminal',
            status: 'completed',
            command: `[Background Process] ${command}`,
            output: `Process started with PID ${proc.pid}.${proc.previewUrl ? `\nLive Preview available at: ${proc.previewUrl}` : ''}`,
            startedAt: startTime,
            completedAt: Date.now(),
            durationMs: 500,
            exitCode: 0,
          };
          res.write(`data: ${JSON.stringify({ text: `\n\`\`\`void-tool-event\n${JSON.stringify(procEvent)}\n\`\`\`\n` })}\n\n`);

          return {
            exitCode: 0,
            output: `Process ${proc.id} launched (PID: ${proc.pid}). Preview URL: ${proc.previewUrl || 'No port exposed'}`,
          };
        } catch (err: any) {
          return { exitCode: 1, output: `Failed to start process: ${err.message}` };
        }
      }

      case 'stop_process': {
        const procId = String(toolCall.id || '').trim();
        const stopped = processManager.stopProcess(procId);
        return {
          exitCode: stopped ? 0 : 1,
          output: stopped ? `Process ${procId} stopped successfully.` : `Process ${procId} not found or already stopped.`,
        };
      }

      case 'list_processes': {
        const procs = processManager.listProcesses(userId);
        const text = procs.map(p => `• [${p.id}] ${p.name} (PID: ${p.pid}) - Status: ${p.status} ${p.previewUrl ? `| Preview: ${p.previewUrl}` : ''}`).join('\n');
        return {
          exitCode: 0,
          output: text ? `[Active Background Processes]:\n${text}` : 'No active background processes.',
        };
      }

      default:
        return { exitCode: 1, output: `Unknown tool action: ${toolCall.action}` };
    }
  }

  /**
   * Helper to generate a single step LLM completion with rotation failover
   */
  private async generateStepCompletion(params: {
    messages: any[];
    systemPrompt: string;
    maxTokens: number;
    provider: string;
    model?: string;
    keys: { groqKeys: string[]; geminiKeys: string[]; cohereKeys: string[]; bazaarLinkKeys: string[] };
    onChunk: (chunk: string) => void;
  }): Promise<boolean> {
    const { messages, systemPrompt, maxTokens, provider, model, keys, onChunk } = params;

    const providersToTry = [
      provider,
      ...['groq', 'gemini', 'cohere', 'bazaarlink'].filter(p => p !== provider),
    ];

    for (const p of providersToTry) {
      try {
        if (p === 'groq' && keys.groqKeys.length > 0) {
          const candidateModels = model && model !== 'auto'
            ? [model, 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'llama-3.3-70b-versatile']
            : ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile'];

          for (const apiKey of keys.groqKeys) {
            try {
              const client = new Groq({ apiKey });
              let stepSucceeded = false;
              for (const groqModel of candidateModels) {
                try {
                  const stream = await client.chat.completions.create({
                    model: groqModel,
                    messages: [
                      { role: 'system', content: systemPrompt },
                      ...messages.map((m: any) => ({
                        role: (m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
                        content: String(m.text || m.content || ''),
                      })),
                    ],
                    max_tokens: maxTokens,
                    temperature: 0.2,
                    stream: true,
                  });

                  for await (const chunk of stream) {
                    const text = chunk.choices[0]?.delta?.content || '';
                    if (text) onChunk(text);
                  }
                  stepSucceeded = true;
                  break;
                } catch (mErr: any) {
                  if (mErr.status === 401) throw mErr;
                  continue;
                }
              }
              if (stepSucceeded) return true;
            } catch (kErr: any) {
              continue;
            }
          }
        } else if (p === 'cohere' && keys.cohereKeys.length > 0) {
          const cohereModel = (model && model !== 'auto' && model !== 'command-r-plus' && model !== 'command-r')
            ? model
            : 'command-r-08-2024';

          for (const token of keys.cohereKeys) {
            try {
              const client = new CohereClient({ token });
              const stream = await client.chatStream({
                message: messages[messages.length - 1]?.text || messages[messages.length - 1]?.content || 'proceed',
                preamble: systemPrompt,
                model: cohereModel,
                chatHistory: messages.slice(0, -1).map((m: any) => ({
                  role: m.role === 'model' || m.role === 'assistant' ? 'CHATBOT' : 'USER',
                  message: m.text || m.content || '',
                })),
              });

              for await (const chatEvent of stream) {
                if (chatEvent.eventType === 'text-generation') {
                  onChunk(chatEvent.text);
                }
              }
              return true;
            } catch (cErr: any) {
              continue;
            }
          }
        } else if (p === 'gemini' && keys.geminiKeys.length > 0) {
          const contents = messages.map((m: any) => ({
            role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.text || m.content || '' }],
          }));

          for (const apiKey of keys.geminiKeys) {
            try {
              const ai = new GoogleGenAI({ apiKey });
              const response = await ai.models.generateContentStream({
                model: model && model !== 'auto' ? model : 'gemini-2.5-flash',
                contents,
                config: {
                  systemInstruction: systemPrompt,
                  maxOutputTokens: maxTokens,
                  temperature: 0.2,
                },
              });

              for await (const chunk of response) {
                if (chunk.text) onChunk(chunk.text);
              }
              return true;
            } catch (gErr: any) {
              continue;
            }
          }
        }
      } catch (err: any) {
        console.warn(`[AutonomousAgent] Provider ${p} step error:`, err.message || err);
      }
    }

    return false;
  }
}

export const autonomousAgent = new AutonomousAgentEngine();
