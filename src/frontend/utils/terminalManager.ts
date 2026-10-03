import { TerminalToolEvent } from '../../models/types';

export interface TerminalExecutionState {
  activeEvent: TerminalToolEvent | null;
  history: TerminalToolEvent[];
  isRunning: boolean;
}

type Listener = (state: TerminalExecutionState) => void;

class TerminalManager {
  private state: TerminalExecutionState = {
    activeEvent: null,
    history: [],
    isRunning: false,
  };

  private listeners = new Set<Listener>();
  private activeAbortCtrl: AbortController | null = null;

  public getState(): TerminalExecutionState {
    return this.state;
  }

  public subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    for (const fn of this.listeners) {
      try {
        fn(this.state);
      } catch (e) {
        console.error('Error in terminal listener:', e);
      }
    }
  }

  /**
   * Register a tool event coming from the agent response stream
   */
  public registerToolEvent(event: TerminalToolEvent) {
    const existingIndex = this.state.history.findIndex(e => e.id === event.id);
    let updatedHistory = [...this.state.history];
    if (existingIndex >= 0) {
      updatedHistory[existingIndex] = event;
    } else {
      updatedHistory.push(event);
    }

    const isRunning = event.status === 'running';

    this.state = {
      activeEvent: isRunning ? event : (this.state.activeEvent?.id === event.id ? event : this.state.activeEvent),
      history: updatedHistory,
      isRunning: isRunning || this.state.isRunning,
    };
    this.notify();
  }

  /**
   * Execute command through the backend execution endpoint with streaming
   */
  public async executeCommand(command: string, cwd?: string): Promise<TerminalToolEvent> {
    const trimmed = command.trim();
    if (!trimmed) throw new Error('Command is empty');

    const id = `term-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const startedAt = Date.now();

    const initialEvent: TerminalToolEvent = {
      id,
      type: 'tool',
      tool: 'terminal',
      status: 'running',
      command: trimmed,
      cwd,
      output: '',
      startedAt,
    };

    this.state = {
      activeEvent: initialEvent,
      history: [...this.state.history, initialEvent],
      isRunning: true,
    };
    this.notify();

    const abortCtrl = new AbortController();
    this.activeAbortCtrl = abortCtrl;

    try {
      const response = await fetch('/api/terminal/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: trimmed, cwd, stream: true, timeoutMs: 60000 }),
        signal: abortCtrl.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Failed to start command: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent: TerminalToolEvent = initialEvent;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith('data:')) continue;
          const dataStr = trimmedLine.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === 'chunk' && parsed.chunk) {
              currentEvent = {
                ...currentEvent,
                output: currentEvent.output + parsed.chunk,
              };
              this.updateEventInHistory(currentEvent);
            } else if (parsed.type === 'done' && parsed.event) {
              currentEvent = {
                ...currentEvent,
                ...parsed.event,
                completedAt: Date.now(),
                durationMs: Date.now() - startedAt,
              };
              this.updateEventInHistory(currentEvent);
            }
          } catch (_) {}
        }
      }

      this.state.isRunning = false;
      this.state.activeEvent = currentEvent;
      this.notify();
      return currentEvent;
    } catch (err: any) {
      const isAbort = err.name === 'AbortError';
      const failedEvent: TerminalToolEvent = {
        ...initialEvent,
        status: isAbort ? 'cancelled' : 'failed',
        output: initialEvent.output + (isAbort ? '\n[Command cancelled by user]' : `\nExecution error: ${err.message}`),
        completedAt: Date.now(),
        durationMs: Date.now() - startedAt,
        exitCode: isAbort ? 130 : 1,
      };

      this.updateEventInHistory(failedEvent);
      this.state.isRunning = false;
      this.state.activeEvent = failedEvent;
      this.notify();
      return failedEvent;
    } finally {
      this.activeAbortCtrl = null;
    }
  }

  public stopActiveCommand(): boolean {
    if (this.state.activeEvent && this.state.activeEvent.id) {
      fetch('/api/terminal/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: this.state.activeEvent.id }),
      }).catch(() => {});
    }

    if (this.activeAbortCtrl) {
      this.activeAbortCtrl.abort();
      this.activeAbortCtrl = null;
      return true;
    }
    return false;
  }

  public clearHistory() {
    this.state = {
      activeEvent: null,
      history: [],
      isRunning: false,
    };
    this.notify();
  }

  private updateEventInHistory(event: TerminalToolEvent) {
    const idx = this.state.history.findIndex(e => e.id === event.id);
    if (idx >= 0) {
      this.state.history[idx] = event;
    } else {
      this.state.history.push(event);
    }
    if (this.state.activeEvent?.id === event.id) {
      this.state.activeEvent = event;
    }
    this.notify();
  }
}

export const terminalManager = new TerminalManager();
