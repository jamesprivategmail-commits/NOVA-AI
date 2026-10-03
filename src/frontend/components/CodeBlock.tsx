import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Download, Terminal, ChevronDown, ChevronUp, GitCommit, ExternalLink, RefreshCw, Upload } from 'lucide-react';
import { getStoredGitHubToken, getStoredActiveRepo, commitFile } from '../utils/github';
import { TerminalToolComponent } from './tools/TerminalToolComponent';
import { terminalManager } from '../utils/terminalManager';
import { TerminalToolEvent } from '../../models/types';

interface CodeBlockProps {
  language: string;
  value: string;
}

const COLLAPSE_THRESHOLD = 14;

export function CodeBlock({ language, value }: CodeBlockProps) {
  // If this code block contains internal tool: "terminal" or terminal command output, render real TerminalToolComponent
  const isTerminalBlock = 
    language === 'terminal' || 
    language === 'sh' || 
    language === 'bash' || 
    value.includes('tool: "terminal"') || 
    value.includes("tool: 'terminal'") || 
    (value.trim().startsWith('$') && !value.includes('npm install --save'));

  if (isTerminalBlock) {
    const sanitized = value.replace(/tool:\s*["']?terminal["']?\s*/gi, '').trim();
    const lines = sanitized.split('\n');
    const firstLine = lines[0]?.trim() || '';
    const cmd = firstLine.startsWith('$') ? firstLine.replace(/^\$\s*/, '') : firstLine;
    const out = lines.slice(1).join('\n').trim();
    const isErr = out.toLowerCase().includes('error:') || out.toLowerCase().includes('failed');
    const evt: TerminalToolEvent = {
      id: 'term-' + Date.now(),
      type: 'tool',
      tool: 'terminal',
      status: isErr ? 'failed' : 'completed',
      command: cmd || 'command',
      output: out,
      startedAt: Date.now() - 2000,
      completedAt: Date.now(),
      durationMs: 2000,
      exitCode: isErr ? 1 : 0
    };
    terminalManager.registerToolEvent(evt);
    return <TerminalToolComponent event={evt} />;
  }

  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitSuccessUrl, setCommitSuccessUrl] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  // Check if this is a dedicated github-commit block
  const isGitHubCommitBlock = language === 'github-commit' || value.includes('---CONTENT---');
  
  let targetPath = '';
  let targetMessage = 'feat: update via VOID AI';
  let cleanCode = value;
  let detectedLang = language;

  if (isGitHubCommitBlock) {
    const parts = value.split('---CONTENT---');
    if (parts.length > 1) {
      const header = parts[0];
      cleanCode = parts.slice(1).join('---CONTENT---').trim();
      const pathMatch = header.match(/path:\s*([^\r\n]+)/i);
      const msgMatch = header.match(/message:\s*([^\r\n]+)/i);
      if (pathMatch) targetPath = pathMatch[1].trim();
      if (msgMatch) targetMessage = msgMatch[1].trim();
      
      // Infer language from path
      const ext = targetPath.split('.').pop()?.toLowerCase();
      if (ext) {
        const extToLang: Record<string, string> = {
          ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
          py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown',
        };
        detectedLang = extToLang[ext] || 'text';
      }
    }
  }

  const lineCount = cleanCode.split('\n').length;
  const shouldCollapse = lineCount > COLLAPSE_THRESHOLD;

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCode);
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
    const ext = extMap[detectedLang.toLowerCase()] || 'txt';
    const blob = new Blob([cleanCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = targetPath ? targetPath.split('/').pop() || `void_ai.${ext}` : `void_ai_${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const handleDirectCommit = async () => {
    const token = getStoredGitHubToken();
    const activeRepo = getStoredActiveRepo();

    if (!token) {
      setCommitError('Please connect your GitHub account in the top menu.');
      setTimeout(() => setCommitError(null), 4000);
      return;
    }

    if (!activeRepo) {
      setCommitError('Please select a target repository in the GitHub Workspace modal.');
      setTimeout(() => setCommitError(null), 4000);
      return;
    }

    const filePath = targetPath || prompt('Enter file path in repository (e.g. src/index.ts):');
    if (!filePath) return;

    setIsCommitting(true);
    setCommitError(null);
    try {
      const result = await commitFile(
        token,
        activeRepo.owner,
        activeRepo.repo,
        filePath,
        cleanCode,
        targetMessage,
        activeRepo.branch
      );
      setCommitSuccessUrl(result.htmlUrl);
    } catch (err: any) {
      setCommitError(err.message || 'Failed to commit file.');
      setTimeout(() => setCommitError(null), 4000);
    } finally {
      setIsCommitting(false);
    }
  };

  const activeRepo = getStoredActiveRepo();

  return (
    <div className={`my-2.5 rounded-xl border ${isGitHubCommitBlock ? 'border-[#3f86ff]/40 bg-[#161B22] shadow-lg shadow-[#3f86ff]/5' : 'border-[#30363D] bg-[#161B22]'} overflow-hidden shadow-md w-full`}>
      {/* GitHub Commit Banner if target path is known */}
      {isGitHubCommitBlock && (
        <div className="bg-gradient-to-r from-[#1c2333] to-[#161B22] px-3 py-2 border-b border-[#3f86ff]/30 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs font-bold text-white tracking-wide">
              {targetPath || 'Repository File'}
            </span>
            {activeRepo && (
              <span className="text-[10px] text-[#8d8d91] bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
                {activeRepo.owner}/{activeRepo.repo} ({activeRepo.branch})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {commitSuccessUrl ? (
              <a
                href={commitSuccessUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 hover:bg-emerald-900 transition-colors"
              >
                <Check size={11} className="text-emerald-400" />
                <span>Committed to GitHub</span>
                <ExternalLink size={10} />
              </a>
            ) : (
              <button
                onClick={handleDirectCommit}
                disabled={isCommitting}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                {isCommitting ? (
                  <>
                    <RefreshCw size={11} className="animate-spin" />
                    <span>Pushing Commit...</span>
                  </>
                ) : (
                  <>
                    <Upload size={11} />
                    <span>Commit Directly to GitHub</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0D1117] border-b border-[#30363D] text-[11px] text-[#8d8d91]">
        <div className="flex items-center gap-1.5 min-w-0">
          <Terminal size={12} className="text-[#8d8d91] shrink-0" />
          <span className="uppercase tracking-wider font-semibold text-white truncate text-[10px]">
            {detectedLang || 'code'}
          </span>
          {targetMessage && isGitHubCommitBlock && (
            <span className="text-[10px] text-[#8d8d91] truncate font-normal hidden sm:inline">
              — "{targetMessage}"
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isGitHubCommitBlock && (
            <button
              onClick={handleDirectCommit}
              disabled={isCommitting}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#21262D] hover:bg-[#30363D] text-slate-300 hover:text-white transition-colors text-[10px] font-medium border border-[#30363D] cursor-pointer"
              title="Commit this snippet to GitHub"
            >
              {isCommitting ? (
                <RefreshCw size={11} className="animate-spin text-emerald-400" />
              ) : commitSuccessUrl ? (
                <Check size={11} className="text-emerald-400" />
              ) : (
                <GitCommit size={11} className="text-[#3f86ff]" />
              )}
              <span className="hidden sm:inline">Commit to Repo</span>
            </button>
          )}

          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#21262D] hover:bg-[#30363D] text-white transition-colors text-[10px] font-medium border border-[#30363D] cursor-pointer"
            title="Download file"
          >
            {downloaded ? <Check size={11} className="text-emerald-400" /> : <Download size={11} className="text-[#8d8d91]" />}
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#21262D] hover:bg-[#30363D] text-white transition-colors text-[10px] font-medium border border-[#30363D] cursor-pointer"
            title="Copy code"
          >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          </button>
        </div>
      </div>

      {commitError && (
        <div className="p-2 bg-red-950/60 border-b border-red-800/40 text-[11px] text-red-300 px-3">
          {commitError}
        </div>
      )}

      {/* Code body — collapsible for long code */}
      <div
        className="overflow-x-auto text-xs"
        style={{ maxHeight: shouldCollapse && !expanded ? '220px' : 'none', overflowY: shouldCollapse && !expanded ? 'hidden' : 'visible' }}
      >
        <SyntaxHighlighter
          language={detectedLang || 'text'}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '0.75rem 0.85rem',
            background: 'transparent',
            fontSize: '0.75rem',
            lineHeight: '1.45',
          }}
          codeTagProps={{
            style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }
          }}
        >
          {cleanCode}
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
