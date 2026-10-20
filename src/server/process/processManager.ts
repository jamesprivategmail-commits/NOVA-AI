import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { ManagedProcess } from '../../models/types';
import { workspaceService } from '../workspace/workspaceService';

interface ActiveProcessEntry {
  info: ManagedProcess;
  process: ChildProcess;
  logs: string[];
  maxLogs: number;
}

export class ProcessManager {
  private processes = new Map<string, ActiveProcessEntry>();

  /**
   * Start a persistent background job/server in the user workspace
   */
  public startProcess(options: {
    userId?: string;
    command: string;
    name?: string;
    cwd?: string;
    port?: number;
    env?: Record<string, string>;
  }): ManagedProcess {
    const { userId, command, name, port: explicitPort, env } = options;
    const id = `proc-${uuidv4().slice(0, 8)}`;
    const workspaceDir = options.cwd || workspaceService.getWorkspaceDir(userId);

    const child = spawn('sh', ['-c', command], {
      cwd: workspaceDir,
      detached: true,
      env: {
        ...process.env,
        ...env,
        PAGER: 'cat',
        CI: 'true',
        FORCE_COLOR: '0',
        PORT: explicitPort ? String(explicitPort) : process.env.PORT,
      },
    });

    const managed: ManagedProcess = {
      id,
      userId: userId || 'workspace-default',
      name: name || command.split(/\s+/)[0] || 'Background Task',
      command,
      pid: child.pid || 0,
      startedAt: Date.now(),
      status: 'running',
      port: explicitPort,
      previewUrl: explicitPort ? `/api/preview/${explicitPort}/` : undefined,
    };

    const entry: ActiveProcessEntry = {
      info: managed,
      process: child,
      logs: [`[Process started: ${command} (PID: ${child.pid})]`],
      maxLogs: 500,
    };

    this.processes.set(id, entry);

    const appendLog = (chunk: Buffer | string) => {
      const text = chunk.toString();
      const lines = text.split('\n');
      for (const line of lines) {
        if (!line) continue;
        entry.logs.push(line);
        if (entry.logs.length > entry.maxLogs) {
          entry.logs.shift();
        }
      }
      entry.info.lastLog = entry.logs[entry.logs.length - 1];

      // Auto-detect port if not provided
      if (!entry.info.port) {
        const detectedPort = this.detectPort(text);
        if (detectedPort) {
          entry.info.port = detectedPort;
          entry.info.previewUrl = `/api/preview/${detectedPort}/`;
        }
      }
    };

    child.stdout?.on('data', appendLog);
    child.stderr?.on('data', appendLog);

    child.on('error', (err) => {
      entry.info.status = 'failed';
      entry.logs.push(`[Process error: ${err.message}]`);
    });

    child.on('close', (code) => {
      entry.info.status = code === 0 ? 'stopped' : 'failed';
      entry.logs.push(`[Process exited with code ${code}]`);
    });

    return entry.info;
  }

  /**
   * Stop / kill a running process by ID
   */
  public stopProcess(id: string): boolean {
    const entry = this.processes.get(id);
    if (!entry) return false;

    try {
      if (entry.process.pid) {
        // Kill negative PID to kill entire process group if spawned with detached: true
        try {
          process.kill(-entry.process.pid, 'SIGTERM');
        } catch (_) {
          entry.process.kill('SIGTERM');
        }

        setTimeout(() => {
          try {
            if (!entry.process.killed) {
              try {
                process.kill(-entry.process.pid!, 'SIGKILL');
              } catch (_) {
                entry.process.kill('SIGKILL');
              }
            }
          } catch (_) {}
        }, 1500);
      }
      entry.info.status = 'stopped';
      entry.logs.push('[Process killed by user/Nova]');
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * List all processes for a user
   */
  public listProcesses(userId?: string): ManagedProcess[] {
    const targetUserId = userId || 'workspace-default';
    const list: ManagedProcess[] = [];
    for (const entry of this.processes.values()) {
      if (!userId || entry.info.userId === targetUserId) {
        list.push({ ...entry.info });
      }
    }
    return list.sort((a, b) => b.startedAt - a.startedAt);
  }

  /**
   * Get recent logs for a process
   */
  public getLogs(id: string, limit: number = 200): string[] {
    const entry = this.processes.get(id);
    if (!entry) return [];
    return entry.logs.slice(-limit);
  }

  /**
   * Get single process info
   */
  public getProcess(id: string): ManagedProcess | null {
    return this.processes.get(id)?.info || null;
  }

  /**
   * Auto-detect listening port from standard server log outputs
   */
  private detectPort(text: string): number | null {
    const match = text.match(/(?:listening\s+(?:on|at)|server\s+started\s+(?:on|at)|running\s+(?:on|at)|port\s*:?\s*|http:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):)(\d{2,5})/i);
    if (match && match[1]) {
      const port = parseInt(match[1], 10);
      if (port > 1024 && port < 65535 && port !== 3000) {
        return port;
      }
    }
    return null;
  }
}

export const processManager = new ProcessManager();
