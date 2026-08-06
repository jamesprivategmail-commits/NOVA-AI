import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Download, Terminal } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  value: string;
}

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extMap: Record<string, string> = {
      javascript: 'js',
      js: 'js',
      typescript: 'ts',
      ts: 'ts',
      python: 'py',
      py: 'py',
      html: 'html',
      css: 'css',
      json: 'json',
      csv: 'csv',
      sql: 'sql',
      markdown: 'md',
      md: 'md',
      xml: 'xml',
      sh: 'sh',
      bash: 'sh',
      php: 'php',
      cpp: 'cpp',
      c: 'c',
      java: 'java',
    };

    const ext = extMap[language.toLowerCase()] || 'txt';
    const blob = new Blob([value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `void_ai_export_${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="my-3 sm:my-5 rounded-lg sm:rounded-xl border border-[#30363D] bg-[#161B22] overflow-hidden shadow-md w-full">
      {/* Header bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 sm:px-4 sm:py-2 bg-[#0D1117] border-b border-[#30363D] text-[11px] sm:text-xs font-mono text-slate-400">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Terminal size={13} className="text-red-400 shrink-0" />
          <span className="uppercase tracking-wider font-semibold text-slate-300 truncate">
            {language || 'text'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-[#21262D] hover:bg-[#30363D] text-slate-300 hover:text-white transition-colors text-[10px] sm:text-xs font-medium border border-[#30363D]"
            title="Download file"
          >
            {downloaded ? (
              <>
                <Check size={12} className="text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Saved</span>
              </>
            ) : (
              <>
                <Download size={12} className="text-red-400" />
                <span className="hidden sm:inline">Download File</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-[#21262D] hover:bg-[#30363D] text-slate-300 hover:text-white transition-colors text-[10px] sm:text-xs font-medium border border-[#30363D]"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code body */}
      <div className="overflow-x-auto text-xs sm:text-sm">
        <SyntaxHighlighter
          language={language || 'text'}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '0.875rem 0.75rem',
            background: 'transparent',
            fontSize: '0.8125rem',
            lineHeight: '1.5',
          }}
          codeTagProps={{
            style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
