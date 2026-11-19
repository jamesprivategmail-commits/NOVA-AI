import React, { useState } from 'react';
import { X, Download, Archive, Trash2, Eye, Copy, Check, Layers } from 'lucide-react';
import { ArtifactRecord } from '../../../models/types';
import { formatFileSize } from '../../../utils/artifactParser';
import { bundleArtifactsAsZipApi, deleteArtifactApi } from '../../../api/client';
import { copyTextToClipboard, getArtifactVisualMeta, triggerArtifactDownload } from './artifactUiHelpers';
import { ArtifactViewerModal } from './ArtifactViewerModal';

interface ConversationArtifactsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  artifacts: ArtifactRecord[];
  userId: string;
  conversationId: string;
  onArtifactDeleted?: (id: string) => void;
  onZipCreated?: (zipArtifact: ArtifactRecord) => void;
  onOpenInWorkspace?: (path: string, content: string) => void;
}

export function ConversationArtifactsDrawer({
  isOpen,
  onClose,
  artifacts,
  userId,
  conversationId,
  onArtifactDeleted,
  onZipCreated,
  onOpenInWorkspace,
}: ConversationArtifactsDrawerProps) {
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isBundling, setIsBundling] = useState(false);

  if (!isOpen) return null;

  const nonZipArtifacts = artifacts.filter((a) => a.extension !== 'zip');

  const handleBundleAll = async () => {
    if (nonZipArtifacts.length === 0 || !conversationId) return;
    setIsBundling(true);
    try {
      const zipArt = await bundleArtifactsAsZipApi({
        userId,
        conversationId,
        artifactIds: nonZipArtifacts.map((a) => a.id),
        projectName: 'conversation-artifacts',
      });
      onZipCreated?.(zipArt);
      await triggerArtifactDownload(zipArt);
    } catch (err) {
      console.error('Failed to bundle conversation artifacts:', err);
    } finally {
      setIsBundling(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex justify-end animate-fadeIn">
        <div className="w-full max-w-md h-full glass-thick border-l border-[var(--line-strong)] flex flex-col shadow-[var(--shadow-lg)]">
          <header className="px-4 py-3.5 border-b border-[var(--line)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-muted)] flex items-center justify-center">
                <Layers size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Conversation Artifacts
                </h2>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {artifacts.length} persistent {artifacts.length === 1 ? 'file' : 'files'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {nonZipArtifacts.length > 0 && (
                <button
                  type="button"
                  onClick={handleBundleAll}
                  disabled={isBundling}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }}
                >
                  <Archive size={12} />
                  <span>{isBundling ? 'Bundling...' : 'Download All ZIP'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[var(--text-secondary)] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {artifacts.length === 0 ? (
              <div className="py-16 text-center text-xs text-[var(--text-muted)] px-6">
                No files or artifacts in this conversation yet. Ask Shii to generate a web page, React component, script, report, or attach files/ZIPs.
              </div>
            ) : (
              artifacts.map((art) => {
                const { Icon, label, accentClass, bgClass } = getArtifactVisualMeta(art.extension, art.kind);
                return (
                  <div
                    key={art.id}
                    className="p-3 rounded-2xl glass-strong border border-[var(--line)] flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${bgClass}`}>
                        <Icon size={14} className={accentClass} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {art.filename}
                        </div>
                        <div className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                          {label} · {formatFileSize(art.size)} · {new Date(art.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedArtifact(art)}
                        className="p-1.5 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                        title="Preview / View code"
                      >
                        <Eye size={13} />
                      </button>
                      {(art.content || art.extractedPreview) && (
                        <button
                          type="button"
                          onClick={async () => {
                            await copyTextToClipboard(art.content || art.extractedPreview || '');
                            setCopiedId(art.id);
                            setTimeout(() => setCopiedId(null), 1500);
                          }}
                          className="p-1.5 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                          title="Copy content"
                        >
                          {copiedId === art.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => triggerArtifactDownload(art)}
                        className="p-1.5 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                        title="Download"
                      >
                        <Download size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteArtifactApi(art.id, userId);
                          onArtifactDeleted?.(art.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-500/15 text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {selectedArtifact && (
        <ArtifactViewerModal
          artifact={selectedArtifact}
          siblings={artifacts}
          onClose={() => setSelectedArtifact(null)}
          onOpenInWorkspace={onOpenInWorkspace}
        />
      )}
    </>
  );
}
