import React, { useEffect, useState } from 'react';
import {
  X,
  Play,
  Code2,
  Copy,
  Check,
  Download,
  Share2,
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  Minimize2,
  Terminal,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { clsx } from 'clsx';
import { ArtifactRecord } from '../../../models/types';
import { compileInlinePreviewHtml } from '../../../api/client';
import { formatFileSize, isPreviewableKind } from '../../../utils/artifactParser';
import {
  copyTextToClipboard,
  getArtifactVisualMeta,
  getPrismLanguage,
  shareArtifact,
  triggerArtifactDownload,
} from './artifactUiHelpers';

interface ArtifactViewerModalProps {
  artifact: ArtifactRecord;
  siblings?: ArtifactRecord[];
  initialTab?: 'preview' | 'code';
  onClose: () => void;
  onOpenInWorkspace?: (path: string, content: string) => void;
}

export function ArtifactViewerModal({
  artifact,
  siblings = [],
  initialTab,
  onClose,
  onOpenInWorkspace,
}: ArtifactViewerModalProps) {
  const canPreview = isPreviewableKind(artifact.kind);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>(
    initialTab || (canPreview ? 'preview' : 'code')
  );
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharedStatus, setSharedStatus] = useState<string | null>(null);
  const [compiledHtml, setCompiledHtml] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [consoleLogs, setConsoleLogs] = useState<{ type: string; text: string; time: string }[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const { Icon, label, accentClass, bgClass } = getArtifactVisualMeta(artifact.extension, artifact.kind);
  const sourceText = artifact.content ?? artifact.extractedPreview ?? '';
  const hasPersistedServerPreview = Boolean(artifact.id && !artifact.id.startsWith('draft-'));

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data && e.data.source === 'void-sandbox-console') {
        setConsoleLogs((prev) => [
          ...prev.slice(-49),
          { type: e.data.type, text: e.data.text, time: e.data.time },
        ]);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!canPreview || artifact.kind === 'image' || artifact.kind === 'pdf') return;
    if (hasPersistedServerPreview) return; // iframe uses /api/artifacts/:id/preview-html directly

    setIsCompiling(true);
    compileInlinePreviewHtml({
      content: sourceText,
      filename: artifact.filename,
      siblings,
    })
      .then((html) => {
        if (!cancelled) setCompiledHtml(html);
      })
      .catch(() => {
        if (!cancelled && artifact.kind === 'html') {
          setCompiledHtml(sourceText);
        }
      })
      .finally(() => {
        if (!cancelled) setIsCompiling(false);
      });

    return () => {
      cancelled = true;
    };
  }, [artifact.id, artifact.filename, artifact.kind, sourceText, canPreview, hasPersistedServerPreview]);

  const handleCopy = async () => {
    const target = sourceText || artifact.downloadUrl;
    const ok = await copyTextToClipboard(target);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleDownload = async () => {
    await triggerArtifactDownload(artifact);
  };

  const handleShare = async () => {
    const result = await shareArtifact(artifact);
    setSharedStatus(result === 'shared' ? 'Shared' : 'Link Copied');
    setTimeout(() => setSharedStatus(null), 2000);
  };

  const previewEndpoint = hasPersistedServerPreview
    ? `/api/artifacts/${encodeURIComponent(artifact.id)}/preview-html?userId=${encodeURIComponent(artifact.userId)}&v=${iframeKey}`
    : undefined;

  const rawEndpoint = hasPersistedServerPreview
    ? `/api/artifacts/${encodeURIComponent(artifact.id)}/raw?userId=${encodeURIComponent(artifact.userId)}`
    : artifact.base64Data
    ? `data:${artifact.mimeType};base64,${artifact.base64Data}`
    : undefined;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xl flex items-center justify-center p-2 sm:p-5 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={artifact.filename}
    >
      <div
        className={clsx(
          'glass-thick border border-[var(--line-strong)] flex flex-col overflow-hidden shadow-[var(--shadow-lg)] transition-all duration-200',
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-[90vh] rounded-3xl'
        )}
      >
        {/* Header */}
        <header className="px-4 py-3 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={clsx('w-9 h-9 rounded-xl border flex items-center justify-center shrink-0', bgClass)}>
              <Icon size={17} className={accentClass} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[220px] sm:max-w-md">
                  {artifact.title || artifact.filename}
                </h3>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  {label} · {formatFileSize(artifact.size)}
                </span>
              </div>
              <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                {artifact.path || artifact.filename}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canPreview && (
              <div className="flex items-center p-0.5 rounded-xl bg-[var(--bg-2)] border border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer',
                    activeTab === 'preview'
                      ? 'bg-[var(--bg-1)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <Play size={12} />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer',
                    activeTab === 'code'
                      ? 'bg-[var(--bg-1)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <Code2 size={12} />
                  <span>Code</span>
                </button>
              </div>
            )}

            {activeTab === 'preview' && ['html', 'react', 'svg', 'css', 'markdown'].includes(artifact.kind) && (
              <div className="hidden sm:flex items-center p-0.5 rounded-xl bg-[var(--bg-2)] border border-[var(--line)] gap-0.5">
                {(['desktop', 'tablet', 'mobile'] as const).map((vp) => {
                  const VpIcon = vp === 'desktop' ? Monitor : vp === 'tablet' ? Tablet : Smartphone;
                  return (
                    <button
                      key={vp}
                      type="button"
                      onClick={() => setViewport(vp)}
                      className={clsx(
                        'p-1.5 rounded-lg transition-colors cursor-pointer',
                        viewport === vp
                          ? 'bg-[var(--bg-1)] text-[var(--text-primary)] shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      )}
                      title={`${vp} viewport`}
                    >
                      <VpIcon size={13} />
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-1">
              {activeTab === 'preview' && (
                <button
                  type="button"
                  onClick={() => setIframeKey((k) => k + 1)}
                  className="p-2 rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  title="Reload preview"
                >
                  <RefreshCw size={14} />
                </button>
              )}

              {sourceText && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--line)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownload}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }}
              >
                <Download size={13} />
                <span>Download</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--line)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Share artifact link"
              >
                <Share2 size={13} />
                <span className="hidden sm:inline">{sharedStatus || 'Share'}</span>
              </button>

              {onOpenInWorkspace && sourceText && !artifact.isBinary && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenInWorkspace(artifact.path || artifact.filename, sourceText);
                    onClose();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--line)] text-xs font-medium text-[var(--text-primary)] hidden md:flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink size={13} />
                  <span>Workspace</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsFullscreen((f) => !f)}
                className="p-2 rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer hidden sm:inline-flex"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-rose-500/15 text-[var(--text-secondary)] hover:text-rose-500 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Main View */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[var(--bg-0)]">
          {activeTab === 'preview' && canPreview ? (
            <div className="flex-1 min-h-0 flex items-center justify-center p-2 sm:p-4 overflow-auto">
              {artifact.kind === 'image' && rawEndpoint ? (
                <div className="max-w-full max-h-full flex items-center justify-center p-4 rounded-2xl glass-strong border border-[var(--line)]">
                  <img
                    src={rawEndpoint}
                    alt={artifact.filename}
                    className="max-w-full max-h-[74vh] object-contain rounded-xl"
                  />
                </div>
              ) : artifact.kind === 'pdf' && rawEndpoint ? (
                <div className="w-full h-full rounded-2xl overflow-hidden border border-[var(--line)] bg-white shadow-md">
                  <iframe
                    key={iframeKey}
                    src={rawEndpoint}
                    title={artifact.filename}
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div
                  className={clsx(
                    'h-full transition-all duration-200 bg-white rounded-2xl shadow-lg overflow-hidden border border-[var(--line)]',
                    viewport === 'desktop' && 'w-full',
                    viewport === 'tablet' && 'w-[768px] max-w-full',
                    viewport === 'mobile' && 'w-[375px] max-w-full'
                  )}
                >
                  {isCompiling ? (
                    <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500 font-mono">
                      Compiling live sandbox preview...
                    </div>
                  ) : (
                    <iframe
                      key={iframeKey}
                      title={`${artifact.filename} Sandbox Preview`}
                      src={previewEndpoint}
                      srcDoc={previewEndpoint ? undefined : compiledHtml || ''}
                      sandbox="allow-scripts allow-forms"
                      className="w-full h-full border-0 bg-white"
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto bg-[var(--bg-1)]">
              {sourceText ? (
                <SyntaxHighlighter
                  language={getPrismLanguage(artifact.extension)}
                  style={isDark ? oneDark : oneLight}
                  showLineNumbers
                  wrapLines
                  customStyle={{
                    margin: 0,
                    padding: '1.1rem',
                    fontSize: '0.8rem',
                    lineHeight: '1.55',
                    background: 'transparent',
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {sourceText}
                </SyntaxHighlighter>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[var(--text-muted)] gap-3">
                  <Icon size={36} className={accentClass} />
                  <p className="text-sm font-medium text-[var(--text-primary)]">{artifact.filename}</p>
                  <p className="text-xs">Binary file ({formatFileSize(artifact.size)}). Use Download or Preview to view.</p>
                </div>
              )}
            </div>
          )}

          {/* Sandbox Console */}
          {activeTab === 'preview' && ['html', 'react', 'javascript'].includes(artifact.kind) && (
            <div className="shrink-0 border-t border-[var(--line)] bg-[var(--bg-1)]">
              <button
                type="button"
                onClick={() => setIsConsoleOpen((o) => !o)}
                className="w-full h-8 px-4 flex items-center justify-between text-xs font-mono text-[var(--text-secondary)] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Terminal size={12} style={{ color: 'var(--accent)' }} />
                  <span>Sandbox Console ({consoleLogs.length})</span>
                </span>
                <span>{isConsoleOpen ? 'Hide' : 'Show'}</span>
              </button>
              {isConsoleOpen && (
                <div className="max-h-36 overflow-y-auto px-4 py-2 font-mono text-[11px] space-y-1 border-t border-[var(--line)] bg-[var(--bg-0)]">
                  {consoleLogs.length === 0 ? (
                    <div className="text-[var(--text-muted)] italic">No console output captured.</div>
                  ) : (
                    consoleLogs.map((log, i) => (
                      <div
                        key={i}
                        className={clsx(
                          'flex items-start gap-2',
                          log.type === 'error' ? 'text-rose-500' : log.type === 'warn' ? 'text-amber-500' : 'text-[var(--text-secondary)]'
                        )}
                      >
                        <span className="text-[var(--text-muted)] shrink-0">{log.time}</span>
                        <span className="break-all">{log.text}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
