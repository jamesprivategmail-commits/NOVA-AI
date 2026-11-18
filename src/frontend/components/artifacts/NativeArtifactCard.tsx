import React, { useEffect, useState } from 'react';
import {
  Play,
  Code2,
  Copy,
  Check,
  Download,
  Share2,
  Maximize2,
  ExternalLink,
  FolderArchive,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { clsx } from 'clsx';
import { ArtifactRecord } from '../../../models/types';
import { formatFileSize, isPreviewableKind } from '../../../utils/artifactParser';
import { bundleArtifactsAsZipApi, compileInlinePreviewHtml } from '../../../api/client';
import {
  copyTextToClipboard,
  getArtifactVisualMeta,
  getPrismLanguage,
  shareArtifact,
  triggerArtifactDownload,
} from './artifactUiHelpers';
import { ArtifactViewerModal } from './ArtifactViewerModal';

interface NativeArtifactCardProps {
  artifact: ArtifactRecord;
  siblings?: ArtifactRecord[];
  onOpenInWorkspace?: (path: string, content: string) => void;
  defaultExpanded?: boolean;
}

export const NativeArtifactCard = React.memo(function NativeArtifactCard({
  artifact,
  siblings = [],
  onOpenInWorkspace,
  defaultExpanded = true,
}: NativeArtifactCardProps) {
  const canPreview = isPreviewableKind(artifact.kind);
  const autoPreviewDefault = canPreview && ['html', 'react', 'svg', 'image', 'csv', 'xlsx', 'docx', 'pdf', 'markdown'].includes(artifact.kind);

  const [activeTab, setActiveTab] = useState<'preview' | 'code'>(autoPreviewDefault ? 'preview' : 'code');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showFullModal, setShowFullModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [inlinePreviewHtml, setInlinePreviewHtml] = useState<string | null>(null);

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const { Icon, label, accentClass, bgClass } = getArtifactVisualMeta(artifact.extension, artifact.kind);
  const sourceText = artifact.content ?? artifact.extractedPreview ?? '';
  const hasPersistedId = Boolean(artifact.id && !artifact.id.startsWith('draft-'));

  useEffect(() => {
    let cancelled = false;
    if (!canPreview || activeTab !== 'preview' || hasPersistedId) return;
    if (artifact.kind === 'image' || artifact.kind === 'pdf') return;

    compileInlinePreviewHtml({
      content: sourceText,
      filename: artifact.filename,
      siblings,
    })
      .then((html) => {
        if (!cancelled) setInlinePreviewHtml(html);
      })
      .catch(() => {
        if (!cancelled && artifact.kind === 'html') {
          setInlinePreviewHtml(sourceText);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, canPreview, hasPersistedId, artifact.kind, artifact.filename, sourceText]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyTextToClipboard(sourceText || artifact.downloadUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await triggerArtifactDownload(artifact);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const mode = await shareArtifact(artifact);
    setShareNote(mode === 'shared' ? 'Shared' : 'Link copied');
    setTimeout(() => setShareNote(null), 2000);
  };

  const handleExportZip = async () => {
    if (!hasPersistedId) return;
    setIsExportingZip(true);
    try {
      const zipArt = await bundleArtifactsAsZipApi({
        userId: artifact.userId,
        conversationId: artifact.conversationId,
        artifactIds: [artifact.id],
        projectName: artifact.filename.replace(/\.[^.]+$/, ''),
      });
      await triggerArtifactDownload(zipArt);
    } finally {
      setIsExportingZip(false);
      setExportOpen(false);
    }
  };

  const previewUrl = hasPersistedId
    ? `/api/artifacts/${encodeURIComponent(artifact.id)}/preview-html?userId=${encodeURIComponent(artifact.userId)}`
    : undefined;

  const rawUrl = hasPersistedId
    ? `/api/artifacts/${encodeURIComponent(artifact.id)}/raw?userId=${encodeURIComponent(artifact.userId)}`
    : artifact.base64Data
    ? `data:${artifact.mimeType};base64,${artifact.base64Data}`
    : undefined;

  const lineCount = sourceText ? sourceText.split('\n').length : 0;

  return (
    <>
      <div
        className="w-full my-3 rounded-2xl glass-strong border border-[var(--line-strong)] overflow-hidden shadow-[var(--shadow-sm)] transition-all"
        data-testid={`artifact-card-${artifact.filename}`}
      >
        {/* Header Bar */}
        <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--bg-1)]/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={clsx('w-8 h-8 rounded-xl border flex items-center justify-center shrink-0', bgClass)}>
              <Icon size={15} className={accentClass} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs sm:text-[13px] text-[var(--text-primary)] truncate max-w-[200px] sm:max-w-xs">
                  {artifact.filename}
                </span>
                <span className="text-[11px] font-mono text-[var(--text-muted)] shrink-0">
                  {label} · {formatFileSize(artifact.size)}
                </span>
              </div>
              <div className="text-[10px] font-mono text-[var(--text-muted)] truncate flex items-center gap-1.5">
                <span>{artifact.path || artifact.filename}</span>
                {lineCount > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{lineCount} lines</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {canPreview && (
              <div className="flex items-center p-0.5 rounded-lg bg-[var(--bg-2)] border border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('preview');
                    setIsExpanded(true);
                  }}
                  className={clsx(
                    'px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer',
                    activeTab === 'preview'
                      ? 'bg-[var(--bg-1)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <Play size={11} />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('code');
                    setIsExpanded(true);
                  }}
                  className={clsx(
                    'px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer',
                    activeTab === 'code'
                      ? 'bg-[var(--bg-1)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <Code2 size={11} />
                  <span>Code</span>
                </button>
              </div>
            )}

            {sourceText && (
              <button
                type="button"
                onClick={handleCopy}
                className="px-2 py-1 rounded-lg bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--line)] text-[11px] font-medium text-[var(--text-primary)] flex items-center gap-1 transition-colors cursor-pointer"
                title="Copy full source"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white flex items-center gap-1 transition-all cursor-pointer shadow-xs hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }}
              title={`Download ${artifact.filename}`}
            >
              <Download size={12} />
              <span>Download</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((o) => !o)}
                className="px-2 py-1 rounded-lg bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--line)] text-[11px] font-medium text-[var(--text-primary)] flex items-center gap-1 transition-colors cursor-pointer"
                title="Share or Export"
              >
                <Share2 size={11} />
                <span className="hidden sm:inline">{shareNote || 'Export'}</span>
              </button>

              {exportOpen && (
                <div className="absolute right-0 mt-1.5 w-44 rounded-xl glass-thick border border-[var(--line-strong)] shadow-[var(--shadow-md)] py-1 z-30">
                  <button
                    type="button"
                    onClick={(e) => {
                      setExportOpen(false);
                      handleShare(e);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center gap-2 cursor-pointer"
                  >
                    <Share2 size={12} />
                    <span>Share / Copy Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      setShowFullModal(true);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center gap-2 cursor-pointer"
                  >
                    <Maximize2 size={12} />
                    <span>Open Full Viewer</span>
                  </button>
                  {onOpenInWorkspace && sourceText && !artifact.isBinary && (
                    <button
                      type="button"
                      onClick={() => {
                        setExportOpen(false);
                        onOpenInWorkspace(artifact.path || artifact.filename, sourceText);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center gap-2 cursor-pointer"
                    >
                      <ExternalLink size={12} />
                      <span>Open in Workspace</span>
                    </button>
                  )}
                  {hasPersistedId && artifact.extension !== 'zip' && (
                    <button
                      type="button"
                      onClick={handleExportZip}
                      disabled={isExportingZip}
                      className="w-full px-3 py-1.5 text-left text-xs text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <FolderArchive size={12} />
                      <span>{isExportingZip ? 'Bundling ZIP...' : 'Export as ZIP'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowFullModal(true)}
              className="p-1.5 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Expand full view"
            >
              <Maximize2 size={13} />
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded((e) => !e)}
              className="p-1.5 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {/* Body (kept mounted across tab toggles via display or preserved state) */}
        {isExpanded && (
          <div className="bg-[var(--bg-0)]/70">
            {canPreview && (
              <div className={clsx(activeTab === 'preview' ? 'block' : 'hidden')}>
                {artifact.kind === 'image' && rawUrl ? (
                  <div className="p-3 flex items-center justify-center bg-[var(--bg-1)]/50">
                    <img
                      src={rawUrl}
                      alt={artifact.filename}
                      className="max-h-80 max-w-full rounded-xl object-contain border border-[var(--line)] cursor-pointer"
                      onClick={() => setShowFullModal(true)}
                    />
                  </div>
                ) : artifact.kind === 'pdf' && rawUrl ? (
                  <div className="h-80 w-full bg-white">
                    <iframe
                      src={rawUrl}
                      title={artifact.filename}
                      className="w-full h-full border-0"
                    />
                  </div>
                ) : (
                  <div className="h-80 w-full bg-white">
                    <iframe
                      title={`${artifact.filename} Preview`}
                      src={previewUrl}
                      srcDoc={previewUrl ? undefined : inlinePreviewHtml || (artifact.kind === 'html' ? sourceText : '')}
                      sandbox="allow-scripts allow-forms"
                      className="w-full h-full border-0 bg-white"
                    />
                  </div>
                )}
              </div>
            )}

            <div className={clsx(activeTab === 'code' || !canPreview ? 'block' : 'hidden')}>
              {sourceText ? (
                <div className="max-h-96 overflow-auto bg-[var(--bg-1)]">
                  <SyntaxHighlighter
                    language={getPrismLanguage(artifact.extension)}
                    style={isDark ? oneDark : oneLight}
                    showLineNumbers
                    customStyle={{
                      margin: 0,
                      padding: '0.85rem',
                      fontSize: '0.76rem',
                      lineHeight: '1.5',
                      background: 'transparent',
                      fontFamily: '"JetBrains Mono", monospace',
                    }}
                  >
                    {sourceText}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <div className="p-5 text-xs text-[var(--text-muted)] text-center">
                  Binary artifact ({formatFileSize(artifact.size)}). Click Download to save {artifact.filename}.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showFullModal && (
        <ArtifactViewerModal
          artifact={artifact}
          siblings={siblings}
          initialTab={activeTab}
          onClose={() => setShowFullModal(false)}
          onOpenInWorkspace={onOpenInWorkspace}
        />
      )}
    </>
  );
});
