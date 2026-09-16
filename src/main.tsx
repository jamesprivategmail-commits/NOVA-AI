import { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#2b0709] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#202022] border border-[#38383b] rounded-2xl p-6 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 bg-red-950/60 border border-red-800/50 rounded-2xl flex items-center justify-center mx-auto text-red-400 font-bold text-xl">
              !
            </div>
            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            <p className="text-xs text-[#8d8d91] leading-relaxed bg-[#252527] p-3 rounded-xl border border-[#38383b] text-left overflow-x-auto">
              {this.state.error?.message || 'An unexpected runtime error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#3f86ff] hover:opacity-90 text-white font-medium py-2.5 px-4 rounded-xl transition-all text-sm cursor-pointer"
            >
              Reload Application
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

