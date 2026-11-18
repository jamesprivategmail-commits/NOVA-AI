import React, { useState, useRef } from 'react';
import { Send, Square, X, Image as ImageIcon, FileText, Plus, AudioLines, Mic, MicOff, Archive, Play, Loader2, Globe } from 'lucide-react';
import { clsx } from 'clsx';
import { parseZipArchive, ParsedZipResult } from '../utils/zipParser';
import { LiveHtmlPreviewModal } from './workspace/LiveHtmlPreviewModal';
import { ZipInspectorModal } from './workspace/ZipInspectorModal';

export interface ChatAttachment {
  kind: 'image' | 'file' | 'zip';
  data: string;
  name: string;
  mimeType: string;
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
  onSend: (text: string, attachment?: ChatAttachment) => void;
  isLoading: boolean;
  onStop?: () => void;
  onOpenLiveVoice?: () => void;
  onImageGenerate?: (text: string) => void;
  activeCharacterName?: string;
  onActivityChange?: (isUserComposingOrDictating: boolean) => void;
  webResearchEnabled?: boolean;
  onToggleWebResearch?: () => void;
  squadMode?: boolean;
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
}: InputAreaProps) {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewingHtml, setPreviewingHtml] = useState<string | null>(null);
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
          setText(prev => (prev ? `${prev.trim()} ${transcript.trim()}` : transcript.trim()));
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

  const processSelectedFile = async (file: File) => {
    if (!file) return;
    setIsProcessingFile(true);

    try {
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
        const parsed = await parseZipArchive(file);
        setAttachment({
          kind: 'zip',
          data: parsed.aiPromptSnippet,
          name: file.name,
          mimeType: 'application/zip',
          zipStats: {
            fileCount: parsed.totalFiles,
            totalSize: parsed.totalSize,
            hasHtml: parsed.hasHtmlEntry,
            htmlContent: parsed.htmlEntryContent
          },
          htmlContent: parsed.htmlEntryContent,
          parsedZip: parsed
        });
        return;
      }

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachment({
            kind: 'image',
            data: reader.result as string,
            name: file.name,
            mimeType: file.type,
          });
        };
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        const isHtml = lowerName.endsWith('.html') || lowerName.endsWith('.htm') || file.type === 'text/html';
        setAttachment({
          kind: 'file',
          data: content.slice(0, 48000),
          name: file.name,
          mimeType: file.type || 'text/plain',
          htmlContent: isHtml ? content : undefined
        });
      };
      reader.readAsText(file);
    } catch (err: any) {
      console.error('File parsing error:', err);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
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
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if ((trimmed || attachment) && !isLoading && !isProcessingFile) {
      if (imageMode && onImageGenerate && trimmed) {
        onImageGenerate(trimmed);
        setText('');
        setImageMode(false);
        if (textareaRef.current) textareaRef.current.style.height = '36px';
        return;
      }
      onSend(trimmed, attachment || undefined);
      setText('');
      setAttachment(null);
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
          initialHtml={previewingHtml}
          title={attachment?.name || 'Live HTML Sandbox'}
          onClose={() => setPreviewingHtml(null)}
        />
      )}

      {inspectingZip && (
        <ZipInspectorModal
          zipData={inspectingZip}
          onClose={() => setInspectingZip(null)}
          onOpenInHtmlPreview={(html) => {
            setInspectingZip(null);
            setPreviewingHtml(html);
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
          <span>Drop ZIP archive, HTML, image, or code file</span>
        </div>
      )}

      {/* Attachment Processing Loader */}
      {isProcessingFile && (
        <div className="mb-1.5 p-2 px-3 glass-strong rounded-xl flex items-center gap-2.5 text-xs text-[var(--text-secondary)] animate-fadeIn">
          <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />
          <span>Unpacking file contents for {activeCharacterName}...</span>
        </div>
      )}

      {/* Attachment Preview Card */}
      {attachment && !isProcessingFile && (
        <div className="mb-2 p-2 px-3 glass-strong rounded-2xl flex items-center justify-between gap-3 text-xs text-[var(--text-primary)] animate-fadeIn">
          {attachment.kind === 'image' ? (
            <div className="flex items-center gap-2.5 truncate">
              <img src={attachment.data} alt={attachment.name} className="w-8 h-8 rounded-xl object-cover shrink-0 border border-[var(--line)]" />
              <div className="min-w-0">
                <span className="truncate text-xs font-semibold text-[var(--text-primary)] block">{attachment.name}</span>
                <span className="text-[10px] text-[var(--text-muted)]">Image ready to analyze</span>
              </div>
            </div>
          ) : attachment.kind === 'zip' ? (
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Archive size={15} />
              </div>
              <div className="min-w-0">
                <span className="truncate text-xs font-semibold text-[var(--text-primary)] block">{attachment.name}</span>
                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-mono">
                  {attachment.zipStats?.fileCount || 0} files · {((attachment.zipStats?.totalSize || 0) / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent-muted)', color: 'var(--accent)' }}>
                <FileText size={15} />
              </div>
              <div className="min-w-0">
                <span className="truncate text-xs font-semibold text-[var(--text-primary)] block">{attachment.name}</span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {attachment.mimeType} · {attachment.data.length} chars
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            {attachment.parsedZip && (
              <button
                type="button"
                onClick={() => setInspectingZip(attachment.parsedZip!)}
                className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-800 dark:text-amber-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Browse archive files"
              >
                <Archive size={11} />
                <span>Inspect</span>
              </button>
            )}

            {attachment.htmlContent && (
              <button
                type="button"
                onClick={() => setPreviewingHtml(attachment.htmlContent!)}
                className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Open live HTML preview"
              >
                <Play size={10} fill="currentColor" />
                <span>Preview</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="p-1.5 hover:bg-black/[0.06] dark:hover:bg-white/[0.1] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Remove attachment"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* iOS 26 Liquid Glass Composer Dock */}
      <div className={clsx(
        "relative flex items-center w-full min-h-[54px] glass-dock-2026 rounded-full transition-all px-2.5 py-1.5 gap-1.5",
        isDragging && "glow-ring"
      )}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".zip,application/zip,application/x-zip-compressed,image/*,.txt,.md,.json,.csv,.js,.ts,.tsx,.py,.html,.htm,.css,.xml,.yaml,.yml,.log,.pdf"
          className="hidden"
        />

        {/* Attachment (+) Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full glass hover:bg-black/[0.05] dark:hover:bg-white/[0.1] text-[var(--text-primary)] flex items-center justify-center shrink-0 transition-all cursor-pointer"
          title="Attach image, code, or ZIP archive"
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
              : `Ask ${activeCharacterName} anything, or continue where we left off...`
          }
          rows={1}
          autoCapitalize="sentences"
          autoCorrect="on"
          spellCheck={true}
          className={clsx(
            "flex-1 min-h-[38px] max-h-[128px] bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border-0 focus:ring-0 resize-none py-2 px-1.5 outline-none text-base sm:text-sm leading-snug font-sans",
            imageMode && "placeholder:text-[var(--accent)]"
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
        ) : text.trim() || attachment ? (
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
