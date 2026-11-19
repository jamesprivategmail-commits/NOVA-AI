import { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import { isChunkLoadError, recoverFromStaleDeployment } from './utils/chunkRecovery';

// Register installable PWA Service Worker with auto-update & chunk-safe refresh
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        void updateSW(true);
      },
      onRegisterError(error) {
        console.warn('[PWA] Service Worker registration warning:', error);
      },
    });
  } catch (err) {
    console.warn('[PWA] Service Worker setup skipped:', err);
  }

  // Recover automatically once when Vite preload or dynamic ES imports hit stale hashes
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    void recoverFromStaleDeployment(false);
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault();
      void recoverFromStaleDeployment(false);
    }
  });
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  recovering: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    recovering: false,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, recovering: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    if (isChunkLoadError(error)) {
      void recoverFromStaleDeployment(false);
    }
  }

  private handleForceReload = async () => {
    this.setState({ recovering: true });
    await recoverFromStaleDeployment(true);
  };

  public render() {
    if (this.state.hasError) {
      const chunkError = isChunkLoadError(this.state.error);
      return (
        <div className="min-h-screen bg-[#14110F] text-[#F4EFE6] flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-thick rounded-3xl p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl border border-[var(--line-strong)] overflow-hidden mx-auto shadow-md">
              <img src="/pwa-192x192.png" alt="NOVA AI" className="w-full h-full object-cover" />
            </div>
            <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">
              {chunkError ? 'App Update Available' : 'Something went wrong'}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed glass-subtle p-3 rounded-2xl text-left overflow-x-auto">
              {chunkError
                ? 'A newer version of NOVA AI was deployed. Reloading will clear cached assets and restore your workspace.'
                : this.state.error?.message || 'An unexpected runtime error occurred.'}
            </p>
            <button
              type="button"
              onClick={this.handleForceReload}
              disabled={this.state.recovering}
              className="btn btn-primary w-full py-2.5 px-4 rounded-2xl text-sm font-semibold cursor-pointer disabled:opacity-60"
            >
              {this.state.recovering ? 'Updating & Reloading...' : 'Reload Application'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
