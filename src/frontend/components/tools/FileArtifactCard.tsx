import React, { useState } from 'react';
import { FileCode, ChevronDown, ChevronUp, Copy, Check, ExternalLink, Eye, Download, Play } from 'lucide-react';
import { ArtifactRecord, EditorToolEvent } from '../../../models/types';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getExtensionFromName, getMimeTypeForExtension, getArtifactKindForExtension, isPreviewableKind } from '../../../utils/artifactParser';
import { triggerArtifactDownload, copyTextToClipboard } from '../artifacts/artifactUiHelpers';
import { ArtifactViewerModal } from '../artifacts/ArtifactViewerModal';

interface FileArtifactCardProps {
  event: EditorToolEvent;
  onOpenInWorkspace?: (filePath: string, content?: string) => void;
}

export function FileArtifactCard({ event, onOpenInWorkspace }: FileArtifactCardProps) {
  const [showDiff, setShowDiff] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const additions = event.additions ?? 0;
  const deletions = event.deletions ?? 0;
  const fileName = event.filePath.split('/').pop() || event.filePath;
  const contentToDisplay = event.newContent || event.diff || '';
  const ext = getExtensionFromName(fileName);
  const kind = getArtifactKindForExtension(ext);
  const canPreview = Boolean(event.newContent) && isPreviewableKind(kind);
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    html: 'html',
    htm: 'html',
    css: 'css',
    json: 'json',
    py: 'python',
    md: 'markdown',
    svg: 'xml',
  };
  const syntaxLang = langMap[ext] || 'typescript';

  const draftArtifact: ArtifactRecord = {
    id: `draft-tool-${event.id || fileName}`,
    filename: fileName,
    path: event.filePath,
    mimeType: getMimeTypeForExtension(ext),
    extension: ext,
    kind,
    size: new Blob([event.newContent || contentToDisplay]).size,
    content: event.newContent || contentToDisplay,
    storageRef: '',
    downloadUrl: '',
    createdAt: event.completedAt || event.startedAt || Date.now(),
    conversationId: '',
    userId: 'workspace-default',
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyTextToClipboard(contentToDisplay);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await triggerArtifactDownload(draftArtifact);
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenInWorkspace) {
      onOpenInWorkspace(event.filePath, event.newContent);
    } else {
      window.dispatchEvent(
        new CustomEvent('void_ai_open_workspace_file', {
          detail: { path: event.filePath, content: event.newContent || contentToDisplay, tab: 'editor' },
        })
      );
    }
  };

  return (
    <>
      <div className="w-full my-2 rounded-2xl glass-strong border border-[var(--line-strong)] overflow-hidden font-sans text-xs transition-all shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[var(--bg-1)]/70 border-b border-[var(--line)] select-none">
          <div className="flex items-center gap-2 min-w-0">
            <FileCode size={14} style={{ color: 'var(--accent)' }} className="shrink-0" />
            <span className="font-mono font-semibold text-[var(--text-primary)] text-xs truncate">
              {fileName}
            </span>
            {(additions > 0 || deletions > 0) && (
              <div className="flex items-center gap-1 font-mono text-[11px] font-bold">
                {additions > 0 && <span className="text-emerald-500">+{additions}</span>}
                {deletions > 0 && <span className="text-rose-500">−{deletions}</span>}
              </div>
            )}
            {event.summary && (
              <span className="text-[10px] text-[var(--text-muted)] truncate hidden sm:inline">
                · {event.summary}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {canPreview && (
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--line)] text-[var(--text-primary)] text-[11px] font-medium transition-colors cursor-pointer"
              >
                <Play size={11} />
                <span>Preview</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowDiff(!showDiff)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--line)] text-[var(--text-primary)] text-[11px] font-medium transition-colors cursor-pointer"
            >
              <Eye size={11} style={{ color: 'var(--accent)' }} />
              <span>{showDiff ? 'Hide source' : 'View source'}</span>
              {showDiff ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--line)] text-[var(--text-primary)] text-[11px] font-medium transition-colors cursor-pointer"
              title={`Download ${fileName}`}
            >
              <Download size={11} />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              type="button"
              onClick={handleOpen}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-[11px] font-semibold transition-all cursor-pointer hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }}
              title="Open in Workspace editor"
            >
              <span>Open</span>
              <ExternalLink size={11} />
            </button>
          </div>
        </div>

        {showDiff && (
          <div className="p-3 bg-[var(--bg-0)] space-y-2">
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono">
              <span className="truncate">Path: {event.filePath}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--line)] text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-[var(--line)] max-h-72 overflow-y-auto bg-[var(--bg-1)] text-xs">
              <SyntaxHighlighter
                language={event.diff && !event.newContent ? 'diff' : syntaxLang}
                style={isDark ? oneDark : oneLight}
                showLineNumbers
                customStyle={{
                  margin: 0,
                  padding: '0.75rem',
                  fontSize: '11px',
                  lineHeight: '1.5',
                  background: 'transparent',
                }}
              >
                {contentToDisplay}
              </SyntaxHighlighter>
            </div>
          </div>
        )}
      </div>

      {showPreviewModal && (
        <ArtifactViewerModal
          artifact={draftArtifact}
          onClose={() => setShowPreviewModal(false)}
          onOpenInWorkspace={onOpenInWorkspace}
        />
      )}
    </>
  );
}
