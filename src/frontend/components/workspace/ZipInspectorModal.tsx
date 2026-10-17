import React, { useState, useMemo } from 'react';
import { 
  X, Archive, FileText, Code2, Play, Download, Copy, Check, 
  Search, Eye, ArrowUpRight, Folder, FileCode, FileSpreadsheet,
  Globe, Sparkles, Filter, ExternalLink
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ParsedZipResult, ExtractedZipFile } from '../../utils/zipParser';
import { clsx } from 'clsx';

interface ZipInspectorModalProps {
  zipData: ParsedZipResult;
  onClose: () => void;
  onOpenInHtmlPreview?: (html: string, title: string) => void;
  onSendToChat?: (prompt: string) => void;
  onOpenInWorkspace?: (path: string, content: string) => void;
}

export function ZipInspectorModal({
  zipData,
  onClose,
  onOpenInHtmlPreview,
  onSendToChat,
  onOpenInWorkspace
}: ZipInspectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'code' | 'html' | 'styles' | 'config' | 'docs'>('all');
  
  // Choose the initial file (prefer index.html or first extracted text file)
  const defaultFile = useMemo(() => {
    const htmlFile = zipData.extractedFiles.find(f => f.path.toLowerCase().endsWith('index.html') || f.path.toLowerCase().endsWith('.html'));
    if (htmlFile) return htmlFile;
    return zipData.extractedFiles[0] || null;
  }, [zipData]);

  const [selectedFile, setSelectedFile] = useState<ExtractedZipFile | null>(defaultFile);
  const [previewMode, setPreviewMode] = useState<'code' | 'live'>('code');
  const [copied, setCopied] = useState(false);

  // Filter files
  const filteredFiles = useMemo(() => {
    return zipData.extractedFiles.filter(f => {
      const matchesSearch = f.path.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (selectedCategory === 'all') return true;
      const ext = f.path.split('.').pop()?.toLowerCase() || '';

      if (selectedCategory === 'html') return ['html', 'htm', 'xhtml'].includes(ext);
      if (selectedCategory === 'code') return ['js', 'jsx', 'ts', 'tsx', 'py', 'go', 'rs', 'c', 'cpp', 'java'].includes(ext);
      if (selectedCategory === 'styles') return ['css', 'scss', 'sass', 'less', 'svg'].includes(ext);
      if (selectedCategory === 'config') return ['json', 'yaml', 'yml', 'toml', 'xml', 'env', 'gitignore'].includes(ext);
      if (selectedCategory === 'docs') return ['md', 'markdown', 'txt', 'rtf', 'pdf', 'csv'].includes(ext);

      return true;
    });
  }, [zipData, searchQuery, selectedCategory]);

  const handleCopyCode = () => {
    if (selectedFile?.content) {
      navigator.clipboard.writeText(selectedFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadSingleFile = () => {
    if (!selectedFile) return;
    const blob = new Blob([selectedFile.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      html: 'html', htm: 'html',
      css: 'css', scss: 'scss',
      js: 'javascript', jsx: 'jsx',
      ts: 'typescript', tsx: 'tsx',
      py: 'python', json: 'json',
      md: 'markdown', svg: 'xml',
      sh: 'bash', bash: 'bash',
      sql: 'sql', yaml: 'yaml', yml: 'yaml'
    };
    return map[ext] || 'text';
  };

  const isCurrentFileHtml = selectedFile && (
    selectedFile.path.toLowerCase().endsWith('.html') ||
    selectedFile.path.toLowerCase().endsWith('.htm')
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-[#090a0f] border border-white/10 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <header className="h-14 px-4 bg-[#0e1017] border-b border-white/10 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Archive size={17} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate">{zipData.fileName}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                  {zipData.totalFiles} files
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono hidden sm:inline">
                  {(zipData.totalSize / 1024).toFixed(1)} KB uncompressed
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                AI Full Comprehension active · All text entries indexed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {zipData.hasHtmlEntry && onOpenInHtmlPreview && (
              <button
                onClick={() => onOpenInHtmlPreview(zipData.htmlEntryContent || '', `${zipData.fileName} (Web Preview)`)}
                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Play size={12} fill="currentColor" />
                <span>Run Web Entrypoint</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: File Explorer & Filters */}
          <div className="w-full md:w-80 bg-[#0c0d14] border-b md:border-b-0 md:border-r border-white/10 flex flex-col shrink-0">
            {/* Search Box */}
            <div className="p-3 border-b border-white/5 space-y-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter files in archive..."
                  className="w-full bg-[#141622] border border-white/10 focus:border-blue-500/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1">
                {(['all', 'html', 'code', 'styles', 'config', 'docs'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={clsx(
                      "px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider transition-colors cursor-pointer",
                      selectedCategory === cat 
                        ? "bg-blue-600/30 text-blue-300 border border-blue-500/50 font-bold" 
                        : "bg-white/5 text-slate-400 hover:text-slate-200 border border-white/5"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
              {filteredFiles.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No matching files found.
                </div>
              ) : (
                filteredFiles.map((file) => {
                  const isSelected = selectedFile?.path === file.path;
                  const isHtml = file.path.toLowerCase().endsWith('.html');
                  const ext = file.path.split('.').pop() || '';

                  return (
                    <button
                      key={file.path}
                      onClick={() => {
                        setSelectedFile(file);
                        if (!isHtml) setPreviewMode('code');
                      }}
                      className={clsx(
                        "w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-all cursor-pointer",
                        isSelected 
                          ? "bg-blue-600/20 text-white border border-blue-500/40 font-medium" 
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isHtml ? (
                          <Globe size={13} className="text-emerald-400 shrink-0" />
                        ) : ['js', 'ts', 'jsx', 'tsx', 'py'].includes(ext) ? (
                          <FileCode size={13} className="text-blue-400 shrink-0" />
                        ) : ['css', 'scss', 'svg'].includes(ext) ? (
                          <FileText size={13} className="text-pink-400 shrink-0" />
                        ) : (
                          <FileText size={13} className="text-slate-400 shrink-0" />
                        )}
                        <span className="truncate text-xs font-mono">{file.path}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isHtml && (
                          <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                            HTML
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono">
                          {(file.size / 1024).toFixed(1)}k
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Code Viewer / Live Preview */}
          <div className="flex-1 min-w-0 bg-[#090a0f] flex flex-col overflow-hidden">
            {selectedFile ? (
              <>
                {/* File Header Bar */}
                <div className="h-11 px-4 bg-[#0e1017] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-blue-400 font-semibold truncate">
                      {selectedFile.path}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({selectedFile.size} bytes)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* If file is HTML, allow toggling between Code and Live View */}
                    {isCurrentFileHtml && (
                      <div className="flex items-center bg-[#151722] p-0.5 rounded-lg border border-white/10 mr-1">
                        <button
                          onClick={() => setPreviewMode('code')}
                          className={clsx(
                            "px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
                            previewMode === 'code' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                          )}
                        >
                          Code
                        </button>
                        <button
                          onClick={() => setPreviewMode('live')}
                          className={clsx(
                            "px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer",
                            previewMode === 'live' ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                          )}
                        >
                          <Play size={10} fill="currentColor" />
                          <span>Live View</span>
                        </button>
                      </div>
                    )}

                    {/* Ask AI about this file */}
                    {onSendToChat && (
                      <button
                        onClick={() => {
                          onSendToChat(`Please inspect and review this file (\`${selectedFile.path}\`) from the \`${zipData.fileName}\` archive:\n\n\`\`\`${getLanguageFromPath(selectedFile.path)}\n${selectedFile.content || ''}\n\`\`\``);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        title="Inject into AI chat conversation"
                      >
                        <Sparkles size={11} />
                        <span className="hidden sm:inline">Ask AI</span>
                      </button>
                    )}

                    {/* Open in Code Workspace */}
                    {onOpenInWorkspace && selectedFile.content && (
                      <button
                        onClick={() => {
                          onOpenInWorkspace(selectedFile.path, selectedFile.content || '');
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        title="Edit in full Code Workspace"
                      >
                        <ArrowUpRight size={11} />
                        <span className="hidden sm:inline">Workspace</span>
                      </button>
                    )}

                    {/* Copy Code */}
                    <button
                      onClick={handleCopyCode}
                      className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="Copy code"
                    >
                      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>

                    {/* Download File */}
                    <button
                      onClick={handleDownloadSingleFile}
                      className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="Download file"
                    >
                      <Download size={13} />
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-h-0 overflow-auto bg-[#0a0c12]">
                  {previewMode === 'live' && isCurrentFileHtml ? (
                    <iframe
                      title={selectedFile.name}
                      srcDoc={selectedFile.content || ''}
                      sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
                      className="w-full h-full border-none bg-white"
                    />
                  ) : selectedFile.content !== undefined ? (
                    <SyntaxHighlighter
                      language={getLanguageFromPath(selectedFile.path)}
                      style={vscDarkPlus}
                      showLineNumbers={true}
                      customStyle={{
                        margin: 0,
                        padding: '1rem',
                        fontSize: '0.8rem',
                        lineHeight: '1.45',
                        background: 'transparent',
                        fontFamily: '"JetBrains Mono", monospace'
                      }}
                    >
                      {selectedFile.content}
                    </SyntaxHighlighter>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                      <Archive size={32} className="text-slate-600 mb-2" />
                      <p className="text-xs">Binary or non-text file ({selectedFile.size} bytes).</p>
                      <button
                        onClick={handleDownloadSingleFile}
                        className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                      >
                        <Download size={12} />
                        <span>Download Binary File</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                <FileCode size={32} className="text-slate-600 mb-2" />
                <p className="text-xs">Select any file from the archive on the left to inspect.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
