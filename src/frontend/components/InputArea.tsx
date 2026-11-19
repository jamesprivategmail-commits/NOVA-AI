import React, { useState, useRef } from 'react';
import {
  Send,
  Square,
  X,
  Image as ImageIcon,
  Plus,
  AudioLines,
  Mic,
  MicOff,
  Archive,
  Play,
  Loader2,
  Globe,
  Download,
  AlertCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { ArtifactRecord } from '../../models/types';
import { parseZipArchive, ParsedZipResult } from '../utils/zipParser';
import {
  formatFileSize,
  getArtifactKindForExtension,
  getExtensionFromName,
  getMimeTypeForExtension,
  isBinaryExtension,
} from '../../utils/artifactParser';
import { uploadArtifactFile, uploadZipProjectArchive } from '../../api/client';
import { getArtifactVisualMeta, triggerArtifactDownload } from './artifacts/artifactUiHelpers';
import { ArtifactViewerModal } from './artifacts/ArtifactViewerModal';
import { LiveHtmlPreviewModal } from './workspace/LiveHtmlPreviewModal';
import { ZipInspectorModal } from './workspace/ZipInspectorModal';

export interface ChatAttachment {
  id?: string;
  kind: 'image' | 'file' | 'zip';
  data: string;
  name: string;
  extension?: string;
  size?: number;
  mimeType: string;
  artifactId?: string;
  projectId?: string;
  downloadUrl?: string;
  previewUrl?: string;
  artifact?: ArtifactRecord;
  zipStats?: {
    fileCount: number;
    totalSize: number;
    hasHtml: boolean;
    htmlContent?: string;
  };
  htmlContent?: string;
  parsedZip?: ParsedZipResult;
}

interface InputAreaProps {
  onSend: (text: string, attachment?: ChatAttachment, attachments?: ChatAttachment[]) => void;
  isLoading: boolean;
  onStop?: () => void;
  onOpenLiveVoice?: () => void;
  onImageGenerate?: (text: string) => void;
  activeCharacterName?: string;
  onActivityChange?: (isUserComposingOrDictating: boolean) => void;
  webResearchEnabled?: boolean;
  onToggleWebResearch?: () => void;
  squadMode?: boolean;
  userId?: string;
  conversationId?: string | null;
}

const MAX_SINGLE_FILE_BYTES = 25 * 1024 * 1024;
const MAX_ZIP_BYTES = 50 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export const InputArea = React.memo(function InputArea({
  onSend,
  isLoading,
  onStop,
  onOpenLiveVoice,
  onImageGenerate,
  activeCharacterName = 'Shii',
  onActivityChange,
  webResearchEnabled = false,
  onToggleWebResearch,
  squadMode = false,
  userId = 'workspace-default',
  conversationId,
}: InputAreaProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewingHtml, setPreviewingHtml] = useState<{ html: string; title: string } | null>(null);
  const [previewingArtifact, setPreviewingArtifact] = useState<ArtifactRecord | null>(null);
  const [inspectingZip, setInspectingZip] = useState<ParsedZipResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  React.useEffect(() => {
    onActivityChange?.(Boolean(text.trim() || isDictating));
  }, [text, isDictating, onActivityChange]);

  const handleToggleDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (onOpenLiveVoice) onOpenLiveVoice();
      return;
    }
    if (isDictating) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsDictating(false);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setText((prev) => (prev ? `${prev.trim()} ${transcript.trim()}` : transcript.trim()));
        }
      };
      recognition.onerror = () => setIsDictating(false);
      recognition.onend = () => setIsDictating(false);
      recognition.start();
      recognitionRef.current = recognition;
      setIsDictating(true);
    } catch (_) {
      setIsDictating(false);
      if (onOpenLiveVoice) onOpenLiveVoice();
    }
  };

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 38), 128);
    textarea.style.height = `${newHeight}px`;
  }, [text]);

  const processSingleFile = async (file: File): Promise<ChatAttachment | null> => {
    const ext = getExtensionFromName(file.name);
    const mime = file.type || getMimeTypeForExtension(ext);
    const activeConvId = conversationId || 'pending-chat';

    if (ext === 'zip' || mime === 'application/zip' || mime === 'application/x-zip-compressed') {
      if (file.size > MAX_ZIP_BYTES) {
        throw new Error(`${file.name} exceeds the 50 MB ZIP limit.`);
      }
      const [parsedLocal, dataUrl] = await Promise.all([
        parseZipArchive(file),
        readFileAsDataUrl(file),
      ]);
      const backendZip = await uploadZipProjectArchive({
        userId,
        conversationId: activeConvId,
        filename: file.name,
        base64Data: dataUrl,
      });

      const mergedParsedZip: ParsedZipResult = {
        ...parsedLocal,
        extractedFiles:
          backendZip.extractedFiles && backendZip.extractedFiles.length > 0
            ? backendZip.extractedFiles.map((f) => ({
                ...f,
                extension: getExtensionFromName(f.name),
              }))
            : parsedLocal.extractedFiles,
        aiPromptSnippet: backendZip.aiPromptSnippet || parsedLocal.aiPromptSnippet,
      };

      return {
        id: backendZip.artifact.id,
        kind: 'zip',
        data: backendZip.aiPromptSnippet || parsedLocal.aiPromptSnippet,
        name: file.name,
        extension: 'zip',
        size: file.size,
        mimeType: 'application/zip',
        artifactId: backendZip.artifact.id,
        projectId: backendZip.projectId,
        downloadUrl: backendZip.artifact.downloadUrl,
        previewUrl: backendZip.artifact.previewUrl,
        artifact: backendZip.artifact,
        zipStats: {
          fileCount: backendZip.fileTree?.length || parsedLocal.totalFiles,
          totalSize: parsedLocal.totalSize || file.size,
          hasHtml: backendZip.hasHtmlEntry || parsedLocal.hasHtmlEntry,
          htmlContent: backendZip.htmlEntryContent || parsedLocal.htmlEntryContent,
        },
        htmlContent: backendZip.htmlEntryContent || parsedLocal.htmlEntryContent,
        parsedZip: mergedParsedZip,
      };
    }

    if (file.size > MAX_SINGLE_FILE_BYTES) {
      throw new Error(`${file.name} exceeds the 25 MB single file limit.`);
    }

    // Raster image (PNG, JPG, GIF, WEBP)
    if (file.type.startsWith('image/') && ext !== 'svg') {
      const dataUrl = await readFileAsDataUrl(file);
      const artifact = await uploadArtifactFile({
        userId,
        conversationId: activeConvId,
        filename: file.name,
        base64Data: dataUrl,
        mimeType: mime,
      });
      return {
        id: artifact.id,
        kind: 'image',
        data: dataUrl,
        name: file.name,
        extension: ext,
        size: file.size,
        mimeType: mime,
        artifactId: artifact.id,
        downloadUrl: artifact.downloadUrl,
        previewUrl: artifact.previewUrl,
        artifact,
      };
    }

    // Binary office / PDF formats (PDF, XLSX, DOCX)
    if (isBinaryExtension(ext)) {
      const dataUrl = await readFileAsDataUrl(file);
      const artifact = await uploadArtifactFile({
        userId,
        conversationId: activeConvId,
        filename: file.name,
        base64Data: dataUrl,
        mimeType: mime,
      });
      return {
        id: artifact.id,
        kind: 'file',
        data: (artifact.extractedPreview || artifact.content || `[Uploaded binary file: ${file.name}, ${formatFileSize(file.size)}]`).slice(0, 48000),
        name: file.name,
        extension: ext,
        size: file.size,
        mimeType: mime,
        artifactId: artifact.id,
        downloadUrl: artifact.downloadUrl,
        previewUrl: artifact.previewUrl,
        artifact,
      };
    }

    // Text, code, SVG, CSV, Markdown, HTML, JSON, JSX, TSX
    const textContent = await file.text();
    const artifact = await uploadArtifactFile({
      userId,
      conversationId: activeConvId,
      filename: file.name,
      content: textContent,
      mimeType: mime,
    });
    const isHtml = ext === 'html' || ext === 'htm' || mime === 'text/html';

    return {
      id: artifact.id,
      kind: 'file',
      data: textContent.slice(0, 48000),
      name: file.name,
      extension: ext,
      size: file.size,
      mimeType: mime,
      artifactId: artifact.id,
      downloadUrl: artifact.downloadUrl,
      previewUrl: artifact.previewUrl,
      artifact,
      htmlContent: isHtml ? textContent : undefined,
    };
  };

  const processSelectedFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setIsProcessingFile(true);
    setUploadError(null);

    const processed: ChatAttachment[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const result = await processSingleFile(file);
        if (result) processed.push(result);
      } catch (err: any) {
        console.error('File processing error:', err);
        errors.push(err?.message || `Failed to process ${file.name}`);
      }
    }

    if (processed.length > 0) {
      setAttachments((prev) => [...prev, ...processed]);
    }
    if (errors.length > 0) {
      setUploadError(errors[0]);
    }
    setIsProcessingFile(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(e.dataTransfer.files);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const openAttachmentPreview = (att: ChatAttachment) => {
    if (att.parsedZip) {
      setInspectingZip(att.parsedZip);
      return;
    }
    if (att.artifact) {
      setPreviewingArtifact(att.artifact);
      return;
    }
    if (att.htmlContent) {
      setPreviewingHtml({ html: att.htmlContent, title: att.name });
      return;
    }
    const ext = att.extension || getExtensionFromName(att.name);
    setPreviewingArtifact({
      id: att.artifactId || `draft-upload-${att.name}`,
      filename: att.name,
      path: att.name,
      mimeType: att.mimeType,
      extension: ext,
      kind: getArtifactKindForExtension(ext),
      size: att.size || att.data.length,
      content: att.kind === 'image' ? undefined : att.data,
      base64Data: att.kind === 'image' ? att.data : undefined,
      storageRef: '',
      downloadUrl: att.downloadUrl || '',
      previewUrl: att.previewUrl,
      createdAt: Date.now(),
      conversationId: conversationId || '',
      userId,
    });
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if ((trimmed || attachments.length > 0) && !isLoading && !isProcessingFile) {
      if (imageMode && onImageGenerate && trimmed) {
        onImageGenerate(trimmed);
        setText('');
        setImageMode(false);
        if (textareaRef.current) textareaRef.current.style.height = '36px';
        return;
      }
      onSend(trimmed, attachments[0], attachments);
      setText('');
      setAttachments([]);
      setUploadError(null);
      if (textareaRef.current) textareaRef.current.style.height = '36px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="w-full max-w-3xl mx-auto px-2 pb-1 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {previewingHtml && (
        <LiveHtmlPreviewModal
          initialHtml={previewingHtml.html}
          title={previewingHtml.title}
          onClose={() => setPreviewingHtml(null)}
        />
      )}

      {previewingArtifact && (
        <ArtifactViewerModal
          artifact={previewingArtifact}
          onClose={() => setPreviewingArtifact(null)}
        />
      )}

      {inspectingZip && (
        <ZipInspectorModal
          zipData={inspectingZip}
          onClose={() => setInspectingZip(null)}
          onOpenInHtmlPreview={(html, title) => {
            setInspectingZip(null);
            setPreviewingHtml({ html, title: title || inspectingZip.fileName });
          }}
          onSendToChat={(prompt) => {
            setInspectingZip(null);
            setText(prompt);
          }}
        />
      )}

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-x-2 -top-12 bottom-1 glass-thick border-2 border-dashed border-[var(--accent-muted)] rounded-2xl z-30 flex items-center justify-center gap-3 text-[var(--text-primary)] text-xs font-semibold animate-fadeIn">
          <Archive size={20} className="animate-bounce" style={{ color: 'var(--accent)' }} />
          <span>Drop files, documents, images, or ZIP archives</span>
        </div>
      )}

      {/* Inline Upload Validation Error */}
      {uploadError && (
        <div className="mb-1.5 p-2 px-3 rounded-xl bg-rose-500/12 border border-rose-500/35 flex items-center justify-between gap-2 text-xs text-rose-700 dark:text-rose-200 animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle size={14} className="shrink-0 text-rose-500" />
            <span className="truncate">{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="p-1 rounded hover:bg-rose-500/20 cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Attachment Processing Loader */}
      {isProcessingFile && (
        <div className="mb-1.5 p-2 px-3 glass-strong rounded-xl flex items-center gap-2.5 text-xs text-[var(--text-secondary)] animate-fadeIn">
          <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />
          <span>Uploading and indexing files for {activeCharacterName}...</span>
        </div>
      )}

      {/* Multi-File Attachment Cards */}
      {attachments.length > 0 && !isProcessingFile && (
        <div className="mb-2 space-y-1.5 max-h-48 overflow-y-auto">
          {attachments.map((att, idx) => {
            const ext = att.extension || getExtensionFromName(att.name);
            const kind = getArtifactKindForExtension(ext);
            const { Icon, label, accentClass, bgClass } = getArtifactVisualMeta(ext, kind);
            return (
              <div
                key={att.id || `${att.name}-${idx}`}
                className="p-2 px-3 glass-strong rounded-2xl border border-[var(--line)] flex items-center justify-between gap-3 text-xs text-[var(--text-primary)] animate-fadeIn"
              >
                {att.kind === 'image' ? (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={att.data}
                      alt={att.name}
                      className="w-8 h-8 rounded-xl object-cover shrink-0 border border-[var(--line)]"
                    />
                    <div className="min-w-0">
                      <span className="truncate text-xs font-semibold text-[var(--text-primary)] block">
                        {att.name}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        {label} · {formatFileSize(att.size || 0)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={clsx('w-8 h-8 rounded-xl border flex items-center justify-center shrink-0', bgClass)}>
                      <Icon size={15} className={accentClass} />
                    </div>
                    <div className="min-w-0">
                      <span className="truncate text-xs font-semibold text-[var(--text-primary)] block">
                        {att.name}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        {label} · {formatFileSize(att.size || att.data.length)}
                        {att.kind === 'zip' && att.zipStats ? ` · ${att.zipStats.fileCount} files` : ''}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openAttachmentPreview(att)}
                    className="px-2.5 py-1 bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--line)] text-[var(--text-primary)] rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    title={att.kind === 'zip' ? 'Inspect ZIP archive' : 'Preview file'}
                  >
                    {att.kind === 'zip' ? <Archive size={11} /> : <Play size={10} />}
                    <span>{att.kind === 'zip' ? 'Inspect' : 'Preview'}</span>
                  </button>

                  {att.artifact && (
                    <button
                      type="button"
                      onClick={() => triggerArtifactDownload(att.artifact!)}
                      className="p-1.5 hover:bg-black/[0.06] dark:hover:bg-white/[0.1] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                      title={`Download ${att.name}`}
                    >
                      <Download size={13} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="p-1.5 hover:bg-black/[0.06] dark:hover:bg-white/[0.1] rounded-lg text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                    title="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* iOS 26 Liquid Glass Composer Dock */}
      <div
        className={clsx(
          'relative flex items-center w-full min-h-[54px] glass-dock-2026 rounded-full transition-all px-2.5 py-1.5 gap-1.5',
          isDragging && 'glow-ring'
        )}
      >
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".html,.htm,.css,.scss,.js,.jsx,.ts,.tsx,.json,.txt,.md,.markdown,.pdf,.csv,.tsv,.xlsx,.docx,.png,.jpg,.jpeg,.gif,.webp,.svg,.zip,.py,.sql,.yaml,.yml,.xml,image/*,application/zip,application/x-zip-compressed,application/pdf"
          className="hidden"
        />

        {/* Attachment (+) Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full glass hover:bg-black/[0.05] dark:hover:bg-white/[0.1] text-[var(--text-primary)] flex items-center justify-center shrink-0 transition-all cursor-pointer"
          title="Attach files (HTML, CSS, JS, React, JSON, CSV, XLSX, DOCX, PDF, PNG, JPG, SVG, ZIP)"
        >
          <Plus size={18} />
        </button>

        {/* Image Generation Toggle */}
        <button
          type="button"
          onClick={() => setImageMode(!imageMode)}
          className={clsx(
            'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer border',
            imageMode
              ? 'shadow-md'
              : 'glass hover:bg-black/[0.05] dark:hover:bg-white/[0.1] text-[var(--text-primary)]'
          )}
          style={imageMode ? { background: 'var(--accent)', color: '#fff', borderColor: 'transparent' } : undefined}
          title={imageMode ? 'Image prompt mode active' : 'Generate an image'}
        >
          <ImageIcon size={17} />
        </button>

        {/* Live Web Research & Multi-Page Crawl Toggle */}
        {onToggleWebResearch && (
          <button
            type="button"
            onClick={onToggleWebResearch}
            className={clsx(
              'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer border',
              webResearchEnabled
                ? 'shadow-md'
                : 'glass hover:bg-black/[0.05] dark:hover:bg-white/[0.1] text-[var(--text-primary)]'
            )}
            style={webResearchEnabled ? { background: 'var(--accent)', color: '#fff', borderColor: 'transparent' } : undefined}
            title={webResearchEnabled ? 'Live Internet Research & Multi-Page Crawl: ON' : 'Enable Live Internet Research & Full-Site Crawl'}
          >
            <Globe size={17} />
          </button>
        )}

        {/* Message Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            imageMode
              ? `Describe an image for ${activeCharacterName} to render...`
              : squadMode
              ? `Ask 4-Model Squad (${activeCharacterName} + 3) · splits tasks in parallel...`
              : webResearchEnabled
              ? `Ask ${activeCharacterName} with live internet & full-website crawl...`
              : `Ask ${activeCharacterName} to build apps, edit ZIPs, or create files...`
          }
          rows={1}
          autoCapitalize="sentences"
          autoCorrect="on"
          spellCheck={true}
          className={clsx(
            'flex-1 min-h-[38px] max-h-[128px] bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border-0 focus:ring-0 resize-none py-2 px-1.5 outline-none text-base sm:text-sm leading-snug font-sans',
            imageMode && 'placeholder:text-[var(--accent)]'
          )}
        />

        {/* Voice Dictation */}
        <button
          type="button"
          onClick={handleToggleDictation}
          className={clsx(
            'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer border',
            isDictating
              ? 'bg-rose-600 border-rose-500 text-white animate-pulse shadow-md'
              : 'glass hover:bg-black/[0.05] dark:hover:bg-white/[0.1] text-[var(--text-primary)]'
          )}
          title={isDictating ? 'Stop voice dictation' : 'Dictate by voice'}
        >
          {isDictating ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        {/* Primary Send / Stop / Live Voice Button */}
        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-rose-600 hover:bg-rose-500 text-white rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-md"
            title="Stop generation"
          >
            <Square size={13} fill="currentColor" />
          </button>
        ) : text.trim() || attachments.length > 0 ? (
          <button
            type="button"
            onClick={handleSend}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95 shadow-md hover:brightness-110 text-white"
            style={{ background: 'linear-gradient(155deg, var(--accent), var(--accent-hover))' }}
            title={`Send to ${activeCharacterName}`}
          >
            <Send size={15} fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenLiveVoice}
            className="w-9 h-9 sm:w-10 sm:h-10 glass hover:bg-black/[0.05] dark:hover:bg-white/[0.1] text-[var(--text-primary)] rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer"
            title="Live voice conversation"
          >
            <AudioLines size={16} />
          </button>
        )}
      </div>
    </div>
  );
});
