import React, { useState, useRef, useLayoutEffect } from 'react';
import { Send, Square, X, Image as ImageIcon, FileText, Plus, AudioLines, Mic, MicOff, Archive, Play, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { parseZipArchive, ParsedZipResult } from '../utils/zipParser';
import { LiveHtmlPreviewModal } from './workspace/LiveHtmlPreviewModal';
import { ZipInspectorModal } from './workspace/ZipInspectorModal';

export interface ChatAttachment {
  kind: 'image' | 'file' | 'zip';
  data: string;       // dataURL for images, text content for files/zips
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
}

export function InputArea({ 
  onSend, 
  isLoading, 
  onStop, 
  onOpenLiveVoice, 
  onImageGenerate
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

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 34), 110);
    textarea.style.height = `${newHeight}px`;
  }, [text]);

  const processSelectedFile = async (file: File) => {
    if (!file) return;
    setIsProcessingFile(true);

    try {
      const lowerName = file.name.toLowerCase();

      // 1. Process ZIP Archive
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

      // 2. Process Image
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

      // 3. Process HTML / Text / Code
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        const isHtml = lowerName.endsWith('.html') || lowerName.endsWith('.htm') || file.type === 'text/html';
        setAttachment({
          kind: 'file',
          data: content.slice(0, 32000),
          name: file.name,
          mimeType: file.type || 'text/plain',
          htmlContent: isHtml ? content : undefined
        });
      };
      reader.readAsText(file);
    } catch (err: any) {
      console.error('File parsing error:', err);
      alert(`Could not process ${file.name}: ${err?.message || 'Unsupported format'}`);
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
        if (textareaRef.current) textareaRef.current.style.height = '34px';
        return;
      }
      onSend(trimmed, attachment || undefined);
      setText('');
      setAttachment(null);
      if (textareaRef.current) textareaRef.current.style.height = '34px';
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
      {/* Live HTML Preview Sandbox Modal */}
      {previewingHtml && (
        <LiveHtmlPreviewModal
          initialHtml={previewingHtml}
          title={attachment?.name || 'Live HTML Sandbox'}
          onClose={() => setPreviewingHtml(null)}
        />
      )}

      {/* ZIP Archive Inspector Modal */}
      {inspectingZip && (
        <ZipInspectorModal
          zipData={inspectingZip}
          onClose={() => setInspectingZip(null)}
          onOpenInHtmlPreview={(html, title) => {
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
        <div className="absolute inset-x-2 -top-12 bottom-1 bg-blue-950/80 backdrop-blur-md border-2 border-dashed border-blue-400 rounded-2xl z-30 flex items-center justify-center gap-3 text-white text-xs font-semibold shadow-2xl animate-fadeIn">
          <Archive size={20} className="text-blue-400 animate-bounce" />
          <span>Drop ZIP archive, HTML, or code file here to analyze</span>
        </div>
      )}

      {/* Attachment Processing Loader */}
      {isProcessingFile && (
        <div className="mb-1.5 p-2 px-3 bg-[#161822] border border-blue-500/30 rounded-xl flex items-center gap-2.5 text-xs text-blue-300 animate-fadeIn">
          <Loader2 size={14} className="animate-spin text-blue-400" />
          <span>Unpacking and parsing file contents for AI analysis...</span>
        </div>
      )}

      {/* Attachment Preview Card */}
      {attachment && !isProcessingFile && (
        <div className="mb-1.5 p-2 px-3 bg-[#12131a] border border-white/10 rounded-xl flex items-center justify-between gap-3 text-xs text-slate-200 shadow-lg animate-fadeIn">
          {attachment.kind === 'image' ? (
            <div className="flex items-center gap-2 truncate">
              <img src={attachment.data} alt={attachment.name} className="w-7 h-7 rounded-lg object-cover shrink-0 border border-white/10" />
              <div className="min-w-0">
                <span className="truncate text-xs font-medium text-white block">{attachment.name}</span>
                <span className="text-[10px] text-slate-400">Image attachment</span>
              </div>
            </div>
          ) : attachment.kind === 'zip' ? (
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <Archive size={15} />
              </div>
              <div className="min-w-0">
                <span className="truncate text-xs font-bold text-white block">{attachment.name}</span>
                <span className="text-[10px] text-amber-400 font-mono">
                  📦 {attachment.zipStats?.fileCount || 0} files unpacked · {((attachment.zipStats?.totalSize || 0) / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                <FileText size={15} />
              </div>
              <div className="min-w-0">
                <span className="truncate text-xs font-medium text-white block">{attachment.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {attachment.mimeType} · {attachment.data.length} chars
                </span>
              </div>
            </div>
          )}

          {/* Action buttons (Inspect ZIP, Preview HTML if available, Remove) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {attachment.parsedZip && (
              <button
                type="button"
                onClick={() => setInspectingZip(attachment.parsedZip!)}
                className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                title="Inspect directory tree & browse files in archive"
              >
                <Archive size={11} />
                <span>Inspect ZIP</span>
              </button>
            )}

            {attachment.htmlContent && (
              <button
                type="button"
                onClick={() => setPreviewingHtml(attachment.htmlContent!)}
                className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                title="Run live interactive HTML sandbox"
              >
                <Play size={10} fill="currentColor" />
                <span>Live Preview</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Remove attachment"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Composer Dock */}
      <div className={clsx(
        "relative flex items-center w-full min-h-[52px] glass-dock-2026 rounded-full transition-all px-2.5 py-1.5 gap-1.5 shadow-xl",
        isDragging && "ring-2 ring-blue-500"
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
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#252527] hover:bg-[#38383b] text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          title="Attach image or file"
        >
          <Plus size={19} />
        </button>

        {/* Image Mode Button */}
        <button
          type="button"
          onClick={() => setImageMode(!imageMode)}
          className={clsx(
            "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer",
            imageMode ? "bg-[#3f86ff] text-white" : "bg-[#252527] hover:bg-[#38383b] text-white"
          )}
          title={imageMode ? "Image mode ON" : "Generate image"}
        >
          <ImageIcon size={17} />
        </button>

        {/* Text Input Field */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={imageMode ? "Describe an image to generate…" : "Message..."}
          rows={1}
          autoCapitalize="sentences"
          autoCorrect="on"
          spellCheck={true}
          className={clsx(
            "flex-1 min-h-[38px] max-h-[110px] bg-transparent text-white placeholder:text-[#8d8d91] border-0 focus:ring-0 resize-none py-2 px-1 outline-none text-base sm:text-sm leading-snug font-sans",
            imageMode && "placeholder:text-[#3f86ff]"
          )}
        />

        {/* Push-to-Talk Speech Dictation */}
        <button
          type="button"
          onClick={handleToggleDictation}
          className={clsx(
            "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer",
            isDictating ? "bg-rose-600 text-white animate-pulse" : "bg-[#252527] hover:bg-[#38383b] text-white"
          )}
          title={isDictating ? "Listening... click to stop" : "Voice dictation (speech-to-text)"}
        >
          {isDictating ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        {/* Send / Stop / Live Voice */}
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
            className="w-9 h-9 sm:w-10 sm:h-10 bg-[#3f86ff] hover:opacity-90 text-white rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95 shadow-md"
            title="Send message"
          >
            <Send size={15} fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenLiveVoice}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-[#252527] hover:bg-[#38383b] text-white rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer"
            title="Live voice conversation mode"
          >
            <AudioLines size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
