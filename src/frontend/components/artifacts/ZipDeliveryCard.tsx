import React, { useState } from 'react';
import {
  Archive,
  Download,
  Share2,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Check,
  FileCode2,
  ExternalLink,
} from 'lucide-react';
import { clsx } from 'clsx';
import { ArtifactRecord } from '../../../models/types';
import { formatFileSize } from '../../../utils/artifactParser';
import { inspectZipArtifactApi } from '../../../api/client';
import { ParsedZipResult } from '../../utils/zipParser';
import { shareArtifact, triggerArtifactDownload } from './artifactUiHelpers';

interface ZipDeliveryCardProps {
  zipArtifact: ArtifactRecord;
  onInspectZip?: (zipData: ParsedZipResult) => void;
  onOpenInWorkspace?: (path: string, content: string) => void;
}

export const ZipDeliveryCard = React.memo(function ZipDeliveryCard({
  zipArtifact,
  onInspectZip,
  onOpenInWorkspace,
}: ZipDeliveryCardProps) {
  const [showFiles, setShowFiles] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const fileCount = zipArtifact.fileCount ?? zipArtifact.zipEntries?.length ?? 0;
  const modifiedCount = zipArtifact.modifiedFiles?.length ?? 0;
  const preservedCount = zipArtifact.preservedFiles?.length ?? 0;

  const handleDownloadZip = async () => {
    await triggerArtifactDownload(zipArtifact);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const handleShareZip = async () => {
    const mode = await shareArtifact(zipArtifact);
    setShareNote(mode === 'shared' ? 'Shared' : 'Link copied');
    setTimeout(() => setShareNote(null), 2000);
  };

  const handleInspect = async () => {
    if (!onInspectZip) return;
    setIsInspecting(true);
    try {
      const zipData = await inspectZipArtifactApi(zipArtifact.id, zipArtifact.userId);
      onInspectZip(zipData);
    } catch (err) {
      console.error('Failed to inspect ZIP artifact:', err);
    } finally {
      setIsInspecting(false);
    }
  };

  return (
    <div
      className="w-full my-3 rounded-2xl glass-strong border border-amber-500/35 overflow-hidden shadow-[var(--shadow-sm)]"
      data-testid={`zip-delivery-card-${zipArtifact.filename}`}
    >
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-amber-500/[0.06]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Archive size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
                {zipArtifact.filename}
              </span>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                ZIP · {formatFileSize(zipArtifact.size)} · {fileCount} {fileCount === 1 ? 'file' : 'files'}
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              {zipArtifact.projectName ? `Project: ${zipArtifact.projectName}` : 'Deliverable Archive'}
              {modifiedCount > 0 && ` · ${modifiedCount} updated`}
              {preservedCount > 0 && ` · ${preservedCount} original preserved`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {onInspectZip && (
            <button
              type="button"
              onClick={handleInspect}
              disabled={isInspecting}
              className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--line)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <FolderOpen size={13} />
              <span>{isInspecting ? 'Loading...' : 'Inspect'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadZip}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }}
          >
            {downloaded ? <Check size={13} /> : <Download size={13} />}
            <span>{downloaded ? 'Downloaded' : 'Download ZIP'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareZip}
            className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--line)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 size={12} />
            <span>{shareNote || 'Share'}</span>
          </button>

          {onOpenInWorkspace && (
            <button
              type="button"
              onClick={handleInspect}
              className="p-1.5 rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Explore project archive"
            >
              <ExternalLink size={13} />
            </button>
          )}

          {zipArtifact.zipEntries && zipArtifact.zipEntries.length > 0 && (
            <button
              type="button"
              onClick={() => setShowFiles((s) => !s)}
              className="p-1.5 rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title={showFiles ? 'Hide file list' : 'Show file list'}
            >
              {showFiles ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {showFiles && zipArtifact.zipEntries && zipArtifact.zipEntries.length > 0 && (
        <div className="px-4 py-2.5 border-t border-[var(--line)] bg-[var(--bg-1)]/60 max-h-48 overflow-y-auto space-y-1">
          {zipArtifact.zipEntries.map((entry) => {
            const isModified = zipArtifact.modifiedFiles?.includes(entry.path);
            return (
              <div
                key={entry.path}
                className="flex items-center justify-between text-[11px] font-mono py-0.5 text-[var(--text-secondary)]"
              >
                <span className="flex items-center gap-2 truncate">
                  <FileCode2 size={12} className="text-[var(--text-muted)] shrink-0" />
                  <span className={clsx('truncate', isModified && 'text-[var(--text-primary)] font-semibold')}>
                    {entry.path}
                  </span>
                  {isModified && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">modified</span>
                  )}
                </span>
                <span className="text-[var(--text-muted)] shrink-0 ml-2">{formatFileSize(entry.size)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
