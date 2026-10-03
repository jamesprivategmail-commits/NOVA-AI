import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { TerminalToolEvent } from '../../models/types';

interface RunningTask {
  id: string;
  command: string;
  process: ChildProcess;
  startedAt: number;
  output: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  exitCode?: number;
  completedAt?: number;
  durationMs?: number;
  listeners: ((chunk: string, event: TerminalToolEvent) => void)[];
}

class TerminalService {
  private activeTasks = new Map<string, RunningTask>();
  private completedTasks = new Map<string, RunningTask>();

  /**
   * Run a terminal command with live output streaming and lifecycle tracking
   */
  public runCommand(
    command: string,
    options: {
      cwd?: string;
      onChunk?: (chunk: string, currentEvent: TerminalToolEvent) => void;
      timeoutMs?: number;
    } = {}
  ): {
    id: string;
    promise: Promise<TerminalToolEvent>;
    stop: () => boolean;
  } {
    const id = uuidv4();
    const startedAt = Date.now();
    const cwd = options.cwd || process.cwd();

    // Spawn shell process
    const child = spawn('sh', ['-c', command], {
      cwd,
      env: {
        ...process.env,
        PAGER: 'cat',
        CI: 'true',
        TERM: 'xterm-256color',
        FORCE_COLOR: '0',
      },
    });

    const task: RunningTask = {
      id,
      command,
      process: child,
      startedAt,
      output: '',
      status: 'running',
      listeners: options.onChunk ? [options.onChunk] : [],
    };

    this.activeTasks.set(id, task);

    const makeEvent = (): TerminalToolEvent => ({
      id,
      type: 'tool',
      tool: 'terminal',
      status: task.status,
      command,
      cwd,
      output: task.output,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      durationMs: task.durationMs,
      exitCode: task.exitCode,
      pid: child.pid,
    });

    const promise = new Promise<TerminalToolEvent>((resolve) => {
      let timeoutTimer: NodeJS.Timeout | null = null;
      if (options.timeoutMs && options.timeoutMs > 0) {
        timeoutTimer = setTimeout(() => {
          this.stopCommand(id);
        }, options.timeoutMs);
      }

      const appendOutput = (data: Buffer | string) => {
        const text = data.toString();
        task.output += text;
        const currentEvent = makeEvent();
        task.listeners.forEach((fn) => {
          try {
            fn(text, currentEvent);
          } catch (_) {}
        });
      };

      child.stdout?.on('data', appendOutput);
      child.stderr?.on('data', appendOutput);

      child.on('error', (err) => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        task.status = 'failed';
        task.completedAt = Date.now();
        task.durationMs = task.completedAt - task.startedAt;
        task.output += `\nProcess error: ${err.message}`;
        this.activeTasks.delete(id);
        this.completedTasks.set(id, task);
        resolve(makeEvent());
      });

      child.on('close', (code, signal) => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        const completedAt = Date.now();
        task.completedAt = completedAt;
        task.durationMs = completedAt - task.startedAt;
        task.exitCode = code ?? (signal ? 130 : 0);

        if (task.status === 'running') {
          task.status = (code === 0) ? 'completed' : 'failed';
        }
        if (signal === 'SIGTERM' || signal === 'SIGINT') {
          task.status = 'cancelled';
        }

        this.activeTasks.delete(id);
        this.completedTasks.set(id, task);

        // Keep completed tasks map within 50 items
        if (this.completedTasks.size > 50) {
          const oldestKey = this.completedTasks.keys().next().value;
          if (oldestKey) this.completedTasks.delete(oldestKey);
        }

        resolve(makeEvent());
      });
    });

    return {
      id,
      promise,
      stop: () => this.stopCommand(id),
    };
  }

  /**
   * Stop/terminate a running command process (Functional Stop control)
   */
  public stopCommand(id: string): boolean {
    const task = this.activeTasks.get(id);
    if (!task) return false;

    task.status = 'cancelled';
    task.completedAt = Date.now();
    task.durationMs = task.completedAt - task.startedAt;

    try {
      task.process.kill('SIGTERM');
      // Force kill after 1.5s if not exited
      setTimeout(() => {
        try {
          if (!task.process.killed) {
            task.process.kill('SIGKILL');
          }
        } catch (_) {}
      }, 1500);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get current event state for task
   */
  public getTaskEvent(id: string): TerminalToolEvent | null {
    const task = this.activeTasks.get(id) || this.completedTasks.get(id);
    if (!task) return null;
    return {
      id: task.id,
      type: 'tool',
      tool: 'terminal',
      status: task.status,
      command: task.command,
      output: task.output,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      durationMs: task.durationMs,
      exitCode: task.exitCode,
      pid: task.process.pid,
    };
  }
}

export const terminalService = new TerminalService();
