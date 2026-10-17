import React, { useState, useEffect, useRef } from 'react';
import { X, Smartphone, Tablet, Monitor, Download, RefreshCw, Code2, Play, Terminal, ExternalLink, Check, Copy, Maximize2, Minimize2 } from 'lucide-react';
import { clsx } from 'clsx';

interface LiveHtmlPreviewModalProps {
  initialHtml: string;
  title?: string;
  onClose: () => void;
}

export function LiveHtmlPreviewModal({
  initialHtml,
  title = 'Interactive HTML Sandbox',
  onClose
}: LiveHtmlPreviewModalProps) {
  const [htmlCode, setHtmlCode] = useState(initialHtml);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [consoleLogs, setConsoleLogs] = useState<{ type: 'log' | 'warn' | 'error'; text: string; time: string }[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [key, setKey] = useState(0); // to force iframe refresh
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Injected console interceptor script to pipe inner logs to parent state
  const injectedHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script>
    (function() {
      const origLog = console.log;
      const origWarn = console.warn;
      const origErr = console.error;

      function sendToParent(type, args) {
        try {
          const text = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
          window.parent.postMessage({ source: 'void-sandbox-console', type, text, time: new Date().toLocaleTimeString() }, '*');
        } catch (_) {}
      }

      console.log = function() { sendToParent('log', arguments); origLog.apply(console, arguments); };
      console.warn = function() { sendToParent('warn', arguments); origWarn.apply(console, arguments); };
      console.error = function() { sendToParent('error', arguments); origErr.apply(console, arguments); };
    })();
  </script>
</head>
<body>
  ${htmlCode}
</body>
</html>
`;

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.source === 'void-sandbox-console') {
        setConsoleLogs(prev => [...prev.slice(-49), {
          type: e.data.type,
          text: e.data.text,
          time: e.data.time
        }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(htmlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([htmlCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'page'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div 
        className={clsx(
          "bg-[#090a0f] border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden transition-all duration-200",
          isFullScreen ? "w-full h-full rounded-none" : "w-full max-w-6xl h-[90vh]"
        )}
      >
        {/* Top Header Bar */}
        <header className="h-14 px-4 bg-[#0e1017] border-b border-white/10 flex items-center justify-between shrink-0 select-none">
          {/* Left: Title & Live indicator */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-bold text-sm text-white truncate max-w-[200px] sm:max-w-xs">
                {title}
              </h3>
            </div>
            <span className="hidden md:inline text-xs font-mono text-slate-500">
              · Sandbox Environment
            </span>
          </div>

          {/* Middle: Tab Switcher & Viewport Toggles */}
          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex items-center bg-[#151722] p-1 rounded-lg border border-white/5">
              <button
                onClick={() => setActiveTab('preview')}
                className={clsx(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
                  activeTab === 'preview'
                    ? "bg-red-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Play size={12} />
                <span>Live Preview</span>
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={clsx(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
                  activeTab === 'code'
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Code2 size={12} />
                <span>HTML Code</span>
              </button>
            </div>

            {/* Viewport Toggles (only in preview tab) */}
            {activeTab === 'preview' && (
              <div className="hidden sm:flex items-center bg-[#151722] p-1 rounded-lg border border-white/5 gap-0.5">
                <button
                  onClick={() => setViewport('desktop')}
                  className={clsx(
                    "p-1.5 rounded-md transition-colors cursor-pointer",
                    viewport === 'desktop' ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                  )}
                  title="Desktop (100%)"
                >
                  <Monitor size={14} />
                </button>
                <button
                  onClick={() => setViewport('tablet')}
                  className={clsx(
                    "p-1.5 rounded-md transition-colors cursor-pointer",
                    viewport === 'tablet' ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                  )}
                  title="Tablet (768px)"
                >
                  <Tablet size={14} />
                </button>
                <button
                  onClick={() => setViewport('mobile')}
                  className={clsx(
                    "p-1.5 rounded-md transition-colors cursor-pointer",
                    viewport === 'mobile' ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                  )}
                  title="Mobile (375px)"
                >
                  <Smartphone size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setKey(k => k + 1)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Reload sandbox"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={handleCopyCode}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Copy code"
            >
              {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Download HTML file"
            >
              <Download size={15} />
            </button>
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer hidden sm:inline-flex"
              title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer ml-1"
              title="Close Sandbox"
            >
              <X size={17} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 min-h-0 relative flex flex-col bg-[#050608] overflow-hidden">
          {activeTab === 'preview' ? (
            <div className="flex-1 w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-auto bg-[#0a0c12]">
              <div 
                className={clsx(
                  "h-full transition-all duration-300 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-white/20",
                  viewport === 'desktop' && "w-full",
                  viewport === 'tablet' && "w-[768px]",
                  viewport === 'mobile' && "w-[375px]"
                )}
              >
                <iframe
                  key={key}
                  ref={iframeRef}
                  srcDoc={injectedHtml}
                  title="VOID HTML Live Sandbox"
                  sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                  className="w-full h-full border-0 bg-white"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 w-full h-full flex flex-col p-3">
              <div className="text-xs text-slate-400 mb-2 flex items-center justify-between font-mono">
                <span>Direct HTML/CSS/JS Editor · Real-time live reload active</span>
                <span className="text-slate-500">{htmlCode.length} chars</span>
              </div>
              <textarea
                value={htmlCode}
                onChange={(e) => setHtmlCode(e.target.value)}
                className="flex-1 w-full p-4 bg-[#0a0c10] border border-white/10 rounded-xl text-slate-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-blue-500/60 resize-none"
                spellCheck={false}
              />
            </div>
          )}

          {/* Collapsible Sandbox Console Drawer */}
          <div className="shrink-0 border-t border-white/10 bg-[#0d0e14]">
            <div 
              onClick={() => setIsConsoleOpen(!isConsoleOpen)}
              className="h-8 px-4 flex items-center justify-between cursor-pointer hover:bg-white/5 select-none transition-colors"
            >
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Terminal size={12} className="text-amber-400" />
                <span>Console Logs ({consoleLogs.length})</span>
                {consoleLogs.some(l => l.type === 'error') && (
                  <span className="text-[10px] text-red-400 font-bold px-1.5 py-0.2 bg-red-950/60 rounded">
                    Errors detected
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {isConsoleOpen ? 'Hide ▲' : 'Show ▼'}
              </span>
            </div>

            {isConsoleOpen && (
              <div className="max-h-36 overflow-y-auto p-3 font-mono text-xs space-y-1 bg-black/60 border-t border-white/5">
                {consoleLogs.length === 0 ? (
                  <div className="text-slate-500 italic text-[11px]">No console output yet.</div>
                ) : (
                  consoleLogs.map((log, idx) => (
                    <div 
                      key={idx} 
                      className={clsx(
                        "flex items-start gap-2 text-[11px]",
                        log.type === 'error' && "text-red-400",
                        log.type === 'warn' && "text-amber-300",
                        log.type === 'log' && "text-slate-300"
                      )}
                    >
                      <span className="text-slate-600 shrink-0 text-[10px]">{log.time}</span>
                      <span className="break-all">{log.text}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
