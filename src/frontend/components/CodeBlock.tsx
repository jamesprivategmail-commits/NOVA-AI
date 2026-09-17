import React, { useState, useRef, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Download, Terminal, ChevronDown, ChevronUp } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  value: string;
}

const COLLAPSE_THRESHOLD = 12; // lines before collapse kicks in

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const lineCount = value.split('\n').length;
  const shouldCollapse = lineCount > COLLAPSE_THRESHOLD;

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extMap: Record<string, string> = {
      javascript: 'js', js: 'js', typescript: 'ts', ts: 'ts',
      python: 'py', py: 'py', html: 'html', css: 'css',
      json: 'json', csv: 'csv', sql: 'sql', markdown: 'md', md: 'md',
      xml: 'xml', sh: 'sh', bash: 'sh', php: 'php',
      cpp: 'cpp', c: 'c', java: 'java',
    };
    const ext = extMap[language.toLowerCase()] || 'txt';
    const blob = new Blob([value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `void_ai_${language || 'code'}_${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="my-2 rounded-lg border border-[#30363D] bg-[#161B22] overflow-hidden shadow-md w-full">
      {/* Header bar */}
      <div className="flex items-center justify-between px-2.5 py-1 bg-[#0D1117] border-b border-[#30363D] text-[11px] text-[#8d8d91]">
        <div className="flex items-center gap-1.5 min-w-0">
          <Terminal size={12} className="text-[#8d8d91] shrink-0" />
          <span className="uppercase tracking-wider font-semibold text-white truncate text-[10px]">
            {language || 'text'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#21262D] hover:bg-[#30363D] text-white transition-colors text-[10px] font-medium border border-[#30363D] cursor-pointer"
            title="Download file"
          >
            {downloaded ? (
              <Check size={11} className="text-emerald-400" />
            ) : (
              <Download size={11} className="text-[#8d8d91]" />
            )}
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#21262D] hover:bg-[#30363D] text-white transition-colors text-[10px] font-medium border border-[#30363D] cursor-pointer"
            title="Copy code"
          >
            {copied ? (
              <Check size={11} className="text-emerald-400" />
            ) : (
              <Copy size={11} />
            )}
          </button>
        </div>
      </div>

      {/* Code body — collapsible for long code */}
      <div
        className="overflow-x-auto text-xs"
        style={{ maxHeight: shouldCollapse && !expanded ? '180px' : 'none', overflowY: shouldCollapse && !expanded ? 'hidden' : 'visible' }}
      >
        <SyntaxHighlighter
          language={language || 'text'}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '0.625rem 0.75rem',
            background: 'transparent',
            fontSize: '0.75rem',
            lineHeight: '1.45',
          }}
          codeTagProps={{
            style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>

      {/* Expand / Collapse toggle */}
      {shouldCollapse && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-1 bg-[#0D1117] border-t border-[#30363D] text-[10px] text-[#8d8d91] hover:text-white transition-colors cursor-pointer"
        >
          {expanded ? (
            <>Show less <ChevronUp size={11} /></>
          ) : (
            <>Show all {lineCount} lines <ChevronDown size={11} /></>
          )}
        </button>
      )}
    </div>
  );
}
