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
    <div className="my-5 rounded-xl border border-[#30363D] bg-[#161B22] overflow-hidden shadow-lg">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0D1117] border-b border-[#30363D] text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-red-400" />
          <span className="uppercase tracking-wider font-semibold text-slate-300">
            {language || 'text'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#21262D] hover:bg-[#30363D] text-slate-300 hover:text-white transition-colors text-xs font-medium border border-[#30363D]"
            title="Download file"
          >
            {downloaded ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Downloaded!</span>
              </>
            ) : (
              <>
                <Download size={13} className="text-red-400" />
                <span>Download File</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#21262D] hover:bg-[#30363D] text-slate-300 hover:text-white transition-colors text-xs font-medium border border-[#30363D]"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code body */}
      <div className="overflow-x-auto text-sm">
        <SyntaxHighlighter
          language={language || 'text'}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1.25rem 1rem',
            background: 'transparent',
            fontSize: '0.875rem',
            lineHeight: '1.6',
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
