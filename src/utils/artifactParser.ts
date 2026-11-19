import { ArtifactKind } from '../models/types';

export interface DetectedArtifactFile {
  filename: string;
  path: string;
  extension: string;
  mimeType: string;
  kind: ArtifactKind;
  content: string;
  title?: string;
  projectName?: string;
  description?: string;
  rawBlock?: string;
  isComplete: boolean;
}

export interface ParsedArtifactResponse {
  cleanedMarkdown: string;
  files: DetectedArtifactFile[];
  projectName?: string;
  hasInProgressArtifact: boolean;
}

export const SUPPORTED_EXTENSIONS = new Set([
  'html', 'htm', 'css', 'scss', 'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx',
  'json', 'txt', 'log', 'md', 'markdown', 'pdf', 'csv', 'tsv', 'xlsx', 'docx',
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'zip',
  'py', 'sql', 'yaml', 'yml', 'xml', 'sh', 'bash', 'env', 'gitignore'
]);

const MIME_MAP: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  scss: 'text/x-scss; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8',
  cjs: 'application/javascript; charset=utf-8',
  jsx: 'text/jsx; charset=utf-8',
  ts: 'application/typescript; charset=utf-8',
  tsx: 'text/tsx; charset=utf-8',
  json: 'application/json; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  log: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  markdown: 'text/markdown; charset=utf-8',
  pdf: 'application/pdf',
  csv: 'text/csv; charset=utf-8',
  tsv: 'text/tab-separated-values; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  zip: 'application/zip',
  py: 'text/x-python; charset=utf-8',
  sql: 'application/sql; charset=utf-8',
  yaml: 'application/yaml; charset=utf-8',
  yml: 'application/yaml; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  sh: 'application/x-sh; charset=utf-8',
  bash: 'application/x-sh; charset=utf-8',
};

export function getExtensionFromName(name: string): string {
  const clean = (name || '').split('?')[0].split('#')[0].trim();
  const base = clean.split('/').pop() || '';
  if (!base.includes('.')) return 'txt';
  return base.split('.').pop()?.toLowerCase() || 'txt';
}

export function getMimeTypeForExtension(ext: string): string {
  const normalized = ext.toLowerCase().replace(/^\./, '');
  return MIME_MAP[normalized] || 'application/octet-stream';
}

export function getArtifactKindForExtension(ext: string): ArtifactKind {
  const e = ext.toLowerCase().replace(/^\./, '');
  if (e === 'html' || e === 'htm') return 'html';
  if (e === 'css' || e === 'scss') return 'css';
  if (e === 'js' || e === 'mjs' || e === 'cjs') return 'javascript';
  if (e === 'jsx' || e === 'tsx') return 'react';
  if (e === 'ts') return 'typescript';
  if (e === 'json') return 'json';
  if (e === 'md' || e === 'markdown') return 'markdown';
  if (e === 'pdf') return 'pdf';
  if (e === 'csv' || e === 'tsv') return 'csv';
  if (e === 'xlsx') return 'xlsx';
  if (e === 'docx') return 'docx';
  if (e === 'svg') return 'svg';
  if (e === 'png' || e === 'jpg' || e === 'jpeg' || e === 'gif' || e === 'webp') return 'image';
  if (e === 'zip') return 'zip';
  if (e === 'txt' || e === 'log') return 'text';
  return 'code';
}

export function isPreviewableKind(kind: ArtifactKind): boolean {
  return [
    'html', 'react', 'svg', 'markdown', 'csv', 'xlsx', 'docx', 'json', 'image', 'pdf', 'css', 'javascript'
  ].includes(kind);
}

export function isBinaryExtension(ext: string): boolean {
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'xlsx', 'docx', 'zip'].includes(ext.toLowerCase().replace(/^\./, ''));
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function sanitizeArtifactPath(rawPath: string): string {
  const normalized = (rawPath || 'artifact.txt')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .filter((seg) => seg && seg !== '.' && seg !== '..')
    .join('/');
  return normalized || 'artifact.txt';
}

function langToExtension(lang: string, content: string): string {
  const l = (lang || '').toLowerCase().trim();
  const map: Record<string, string> = {
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    javascript: 'js',
    js: 'js',
    jsx: 'jsx',
    react: 'jsx',
    typescript: 'ts',
    ts: 'ts',
    tsx: 'tsx',
    json: 'json',
    markdown: 'md',
    md: 'md',
    csv: 'csv',
    svg: 'svg',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yml',
    python: 'py',
    py: 'py',
    sql: 'sql',
    txt: 'txt',
    text: 'txt',
    pdf: 'pdf',
    xlsx: 'xlsx',
    docx: 'docx',
  };
  if (map[l]) return map[l];
  const lower = content.trim().toLowerCase();
  if (lower.startsWith('<!doctype html') || lower.startsWith('<html')) return 'html';
  if (lower.startsWith('<svg')) return 'svg';
  if (content.includes('import React') || /export\s+default\s+function\s+[A-Z]/.test(content)) return 'jsx';
  return 'txt';
}

function extractFilenameFromPrecedingText(preceding: string): string | undefined {
  const tail = preceding.slice(-260);
  const patterns = [
    /(?:File|Filename|Path|Create|Update|Modified|Save\s+as)\s*:\s*`?([a-zA-Z0-9_.\-\/]+\.[a-zA-Z0-9]{1,10})`?/i,
    /#{1,4}\s*`?([a-zA-Z0-9_.\-\/]+\.[a-zA-Z0-9]{1,10})`?\s*$/i,
    /\*\*`?([a-zA-Z0-9_.\-\/]+\.[a-zA-Z0-9]{1,10})`?\*\*\s*:?\s*$/i,
    /`([a-zA-Z0-9_.\-\/]+\.[a-zA-Z0-9]{1,10})`\s*:?\s*$/i,
  ];
  for (const rx of patterns) {
    const m = tail.match(rx);
    if (m?.[1]) {
      const ext = getExtensionFromName(m[1]);
      if (SUPPORTED_EXTENSIONS.has(ext)) return m[1];
    }
  }
  return undefined;
}

function extractFilenameFromCodeHeader(code: string): { filename?: string; strippedCode: string } {
  const lines = code.split('\n');
  const firstLine = (lines[0] || '').trim();
  const patterns = [
    /^\/\/\s*(?:file|filename|path)?\s*:?\s*([a-zA-Z0-9_.\-\/]+\.[a-zA-Z0-9]{1,10})\s*$/i,
    /^\/\*\s*(?:file|filename|path)?\s*:?\s*([a-zA-Z0-9_.\-\/]+\.[a-zA-Z0-9]{1,10})\s*\*\/\s*$/i,
    /^<!--\s*(?:file|filename|path)?\s*:?\s*([a-zA-Z0-9_.\-\/]+\.[a-zA-Z0-9]{1,10})\s*-->\s*$/i,
    /^#\s*(?:file|filename|path)?\s*:?\s*([a-zA-Z0-9_.\-\/]+\.[a-zA-Z0-9]{1,10})\s*$/i,
  ];
  for (const rx of patterns) {
    const m = firstLine.match(rx);
    if (m?.[1]) {
      const ext = getExtensionFromName(m[1]);
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        return {
          filename: m[1],
          strippedCode: lines.slice(1).join('\n').replace(/^\n+/, ''),
        };
      }
    }
  }
  return { strippedCode: code };
}

function shouldPromoteCodeBlockToArtifact(lang: string, code: string, explicitFilename?: string): boolean {
  const l = (lang || '').toLowerCase().trim();
  if (['terminal', 'bash', 'sh', 'shell', 'console', 'void', 'diff', 'patch', 'void-tool-event', 'tool-event', 'void-coding-activity', 'github-coding-activity'].includes(l)) {
    return false;
  }
  if (explicitFilename) return true;

  const lineCount = code.split('\n').length;
  const trimmed = code.trim().toLowerCase();
  if (l === 'html' || l === 'htm' || trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html')) {
    return lineCount >= 4 || trimmed.length >= 80;
  }
  if (l === 'svg' || trimmed.startsWith('<svg')) {
    return lineCount >= 3 || trimmed.length >= 60;
  }
  if (['jsx', 'tsx', 'react'].includes(l) && (lineCount >= 6 || /export\s+(default\s+)?function|React|useState/.test(code))) {
    return true;
  }
  if (l === 'csv' && lineCount >= 2 && code.includes(',')) {
    return true;
  }
  if (['css', 'javascript', 'js', 'typescript', 'ts', 'json', 'python', 'py', 'markdown', 'md'].includes(l) && lineCount >= 10) {
    return true;
  }
  return false;
}

/**
 * Extracts structured and implicit generated file artifacts from an AI response.
 * Replaces huge inline source dumps with clean `<!--NOVA_ARTIFACT:idx-->` tokens
 * so MessageBubble can render dedicated interactive Artifact Cards inline without prose clutter.
 */
export function parseArtifactsFromResponse(rawText: string, isStreaming: boolean = false): ParsedArtifactResponse {
  if (!rawText) {
    return { cleanedMarkdown: '', files: [], hasInProgressArtifact: false };
  }

  let text = rawText;
  const files: DetectedArtifactFile[] = [];
  let projectName: string | undefined;
  let hasInProgressArtifact = false;

  // Detect unclosed ```nova-artifact or ```html block during active streaming
  if (isStreaming) {
    const openFences = (text.match(/```/g) || []).length;
    if (openFences % 2 === 1) {
      hasInProgressArtifact = /```(?:nova-artifact|void-artifact|html|jsx|tsx|svg|css|javascript|js|csv|json|markdown|md)/i.test(text.slice(text.lastIndexOf('```')));
    }
  }

  const registerFile = (file: Omit<DetectedArtifactFile, 'extension' | 'mimeType' | 'kind'> & { extension?: string; mimeType?: string; kind?: ArtifactKind }) => {
    const cleanPath = sanitizeArtifactPath(file.path || file.filename);
    const filename = cleanPath.split('/').pop() || 'artifact.txt';
    const extension = (file.extension || getExtensionFromName(filename)).toLowerCase();
    const mimeType = file.mimeType || getMimeTypeForExtension(extension);
    const kind = file.kind || getArtifactKindForExtension(extension);

    // Deduplicate by path (keep the latest complete version)
    const existingIdx = files.findIndex((f) => f.path.toLowerCase() === cleanPath.toLowerCase());
    const normalized: DetectedArtifactFile = {
      filename,
      path: cleanPath,
      extension,
      mimeType,
      kind,
      content: file.content,
      title: file.title || filename,
      projectName: file.projectName,
      description: file.description,
      rawBlock: file.rawBlock,
      isComplete: file.isComplete,
    };
    if (normalized.projectName && !projectName) {
      projectName = normalized.projectName;
    }
    if (existingIdx >= 0) {
      files[existingIdx] = normalized;
      return existingIdx;
    }
    files.push(normalized);
    return files.length - 1;
  };

  // 1. Parse explicit ```nova-artifact {json meta}\n...``` or ```void-artifact {...}\n...```
  const explicitArtifactRegex = /```(?:nova-artifact|void-artifact)\s*(\{[^\n]*\})?\s*\n([\s\S]*?)```/gi;
  text = text.replace(explicitArtifactRegex, (fullMatch, jsonMetaRaw, body) => {
    let meta: any = {};
    if (jsonMetaRaw) {
      try {
        meta = JSON.parse(jsonMetaRaw.trim());
      } catch (_) {}
    }
    const content = String(body || '').replace(/\n$/, '');
    const rawPath = meta.path || meta.filename || `artifact-${files.length + 1}.${meta.extension || langToExtension(meta.language || '', content)}`;
    const idx = registerFile({
      filename: String(rawPath).split('/').pop() || 'artifact.txt',
      path: String(rawPath),
      extension: meta.extension,
      mimeType: meta.mimeType,
      content,
      title: meta.title,
      projectName: meta.project || meta.projectName,
      description: meta.description,
      rawBlock: fullMatch,
      isComplete: true,
    });
    return `\n\n<!--NOVA_ARTIFACT:${idx}-->\n\n`;
  });

  // 2. Parse ```github-commit\npath: ...\n---CONTENT---\n...``` blocks as artifacts too
  const githubCommitRegex = /```github-commit\s*\n([\s\S]*?)```/gi;
  text = text.replace(githubCommitRegex, (fullMatch, inner) => {
    const parts = String(inner).split('---CONTENT---');
    if (parts.length > 1) {
      const header = parts[0];
      const code = parts.slice(1).join('---CONTENT---').trim();
      const pathMatch = header.match(/path:\s*([^\r\n]+)/i);
      const msgMatch = header.match(/message:\s*([^\r\n]+)/i);
      const filePath = pathMatch ? pathMatch[1].trim() : `file-${files.length + 1}.txt`;
      const idx = registerFile({
        filename: filePath.split('/').pop() || filePath,
        path: filePath,
        content: code,
        description: msgMatch ? msgMatch[1].trim() : undefined,
        rawBlock: fullMatch,
        isComplete: true,
      });
      return `\n\n<!--NOVA_ARTIFACT:${idx}-->\n\n`;
    }
    return fullMatch;
  });

  // 3. Parse standard fenced code blocks that represent complete files / previewable artifacts
  // Supports ```lang, ```lang:path/file.ext, ```file.ext, or ```lang file="path/file.ext"
  const fencedRegex = /```([^\r\n`]*)\r?\n([\s\S]*?)```/g;
  const replacements: { start: number; end: number; replacement: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = fencedRegex.exec(text)) !== null) {
    const infoString = (match[1] || '').trim();
    let lang = infoString;
    let fenceFilename: string | undefined;

    if (infoString.includes(':')) {
      const colonIdx = infoString.indexOf(':');
      const left = infoString.slice(0, colonIdx).trim();
      const right = infoString.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (right && /\.[a-zA-Z0-9]{1,10}$/.test(right)) {
        lang = left || getExtensionFromName(right);
        fenceFilename = right;
      }
    } else if (/^[^\s]+\.[a-zA-Z0-9]{1,10}$/.test(infoString) && SUPPORTED_EXTENSIONS.has(getExtensionFromName(infoString))) {
      fenceFilename = infoString;
      lang = getExtensionFromName(infoString);
    } else {
      const attrMatch = infoString.match(/^([a-zA-Z0-9_\-]+)\s+(?:file|filename|path|title)\s*=\s*["']([^"']+)["']/i);
      if (attrMatch) {
        lang = attrMatch[1];
        if (/\.[a-zA-Z0-9]{1,10}$/.test(attrMatch[2])) {
          fenceFilename = attrMatch[2].trim();
        }
      } else {
        lang = infoString.split(/\s+/)[0] || '';
      }
    }

    const rawCode = match[2] || '';
    const preceding = text.slice(0, match.index);
    const fromPreceding = extractFilenameFromPrecedingText(preceding);
    const { filename: fromHeader, strippedCode } = extractFilenameFromCodeHeader(rawCode);
    const explicitFilename = fenceFilename || fromHeader || fromPreceding;

    if (!shouldPromoteCodeBlockToArtifact(lang, strippedCode, explicitFilename)) {
      continue;
    }

    const ext = explicitFilename ? getExtensionFromName(explicitFilename) : langToExtension(lang, strippedCode);
    const defaultNames: Record<string, string> = {
      html: 'index.html',
      css: 'styles.css',
      js: 'script.js',
      jsx: 'App.jsx',
      tsx: 'App.tsx',
      ts: 'index.ts',
      json: 'data.json',
      csv: 'data.csv',
      svg: 'graphic.svg',
      md: 'document.md',
      pdf: 'document.pdf',
      xlsx: 'spreadsheet.xlsx',
      docx: 'document.docx',
      py: 'main.py',
    };
    const baseName = explicitFilename || `${defaultNames[ext] ? defaultNames[ext].replace(`.${ext}`, '') : 'artifact'}${files.length > 0 && !explicitFilename ? `-${files.length + 1}` : ''}.${ext}`;
    const idx = registerFile({
      filename: baseName.split('/').pop() || baseName,
      path: baseName,
      content: strippedCode.replace(/\n$/, ''),
      rawBlock: match[0],
      isComplete: true,
    });

    replacements.push({
      start: match.index,
      end: match.index + match[0].length,
      replacement: `\n\n<!--NOVA_ARTIFACT:${idx}-->\n\n`,
    });
  }

  if (replacements.length > 0) {
    let rebuilt = '';
    let cursor = 0;
    for (const r of replacements) {
      rebuilt += text.slice(cursor, r.start) + r.replacement;
      cursor = r.end;
    }
    rebuilt += text.slice(cursor);
    text = rebuilt;
  }

  // Clean up duplicate placeholder spacing
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return {
    cleanedMarkdown: text,
    files,
    projectName,
    hasInProgressArtifact,
  };
}
