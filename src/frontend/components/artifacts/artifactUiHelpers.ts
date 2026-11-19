import {
  FileCode2,
  FileText,
  FileJson,
  FileSpreadsheet,
  Image as ImageIcon,
  Archive,
  Globe,
  Palette,
  Atom,
  FileType,
} from 'lucide-react';
import { ArtifactKind, ArtifactRecord } from '../../../models/types';

export function getArtifactVisualMeta(extension: string, kind?: ArtifactKind) {
  const ext = (extension || '').toLowerCase();
  if (ext === 'html' || ext === 'htm' || kind === 'html') {
    return { Icon: Globe, label: 'HTML', accentClass: 'text-orange-600 dark:text-orange-400', bgClass: 'bg-orange-500/12 border-orange-500/25' };
  }
  if (ext === 'jsx' || ext === 'tsx' || kind === 'react') {
    return { Icon: Atom, label: ext.toUpperCase() || 'REACT', accentClass: 'text-sky-600 dark:text-sky-400', bgClass: 'bg-sky-500/12 border-sky-500/25' };
  }
  if (ext === 'css' || ext === 'scss' || kind === 'css') {
    return { Icon: Palette, label: ext.toUpperCase() || 'CSS', accentClass: 'text-indigo-600 dark:text-indigo-400', bgClass: 'bg-indigo-500/12 border-indigo-500/25' };
  }
  if (['js', 'mjs', 'cjs', 'ts', 'py', 'sql', 'sh', 'bash'].includes(ext) || kind === 'javascript' || kind === 'typescript' || kind === 'code') {
    return { Icon: FileCode2, label: ext.toUpperCase() || 'CODE', accentClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-500/12 border-amber-500/25' };
  }
  if (ext === 'json' || kind === 'json') {
    return { Icon: FileJson, label: 'JSON', accentClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-500/12 border-emerald-500/25' };
  }
  if (ext === 'csv' || ext === 'tsv' || ext === 'xlsx' || kind === 'csv' || kind === 'xlsx') {
    return { Icon: FileSpreadsheet, label: ext.toUpperCase() || 'DATA', accentClass: 'text-teal-600 dark:text-teal-400', bgClass: 'bg-teal-500/12 border-teal-500/25' };
  }
  if (ext === 'pdf' || ext === 'docx' || kind === 'pdf' || kind === 'docx') {
    return { Icon: FileType, label: ext.toUpperCase() || 'DOC', accentClass: 'text-rose-600 dark:text-rose-400', bgClass: 'bg-rose-500/12 border-rose-500/25' };
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) || kind === 'image' || kind === 'svg') {
    return { Icon: ImageIcon, label: ext.toUpperCase() || 'IMAGE', accentClass: 'text-pink-600 dark:text-pink-400', bgClass: 'bg-pink-500/12 border-pink-500/25' };
  }
  if (ext === 'zip' || kind === 'zip') {
    return { Icon: Archive, label: 'ZIP', accentClass: 'text-amber-700 dark:text-amber-300', bgClass: 'bg-amber-500/15 border-amber-500/30' };
  }
  return { Icon: FileText, label: ext.toUpperCase() || 'TXT', accentClass: 'text-[var(--accent)]', bgClass: 'bg-[var(--accent-soft)] border-[var(--accent-muted)]' };
}

export function getPrismLanguage(extension: string): string {
  const ext = (extension || '').toLowerCase();
  const map: Record<string, string> = {
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    json: 'json',
    md: 'markdown',
    markdown: 'markdown',
    py: 'python',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    svg: 'xml',
    sh: 'bash',
    bash: 'bash',
    csv: 'text',
    txt: 'text',
  };
  return map[ext] || 'text';
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch (_) {
    return false;
  }
}

export async function triggerArtifactDownload(artifact: Pick<ArtifactRecord, 'id' | 'filename' | 'mimeType' | 'content' | 'base64Data' | 'downloadUrl'>): Promise<void> {
  // Prefer direct server download when artifact has a persisted ID
  if (artifact.id && !artifact.id.startsWith('draft-')) {
    const url = artifact.downloadUrl || `/api/artifacts/${encodeURIComponent(artifact.id)}/download`;
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = artifact.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objUrl), 2500);
      return;
    }
  }

  // Fallback to client Blob construction from real content / base64Data
  let blob: Blob;
  if (artifact.base64Data) {
    const clean = artifact.base64Data.replace(/^data:[^;]+;base64,/, '');
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    blob = new Blob([bytes], { type: artifact.mimeType || 'application/octet-stream' });
  } else {
    blob = new Blob([artifact.content || ''], { type: artifact.mimeType || 'text/plain;charset=utf-8' });
  }
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = artifact.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objUrl), 2500);
}

export async function shareArtifact(artifact: ArtifactRecord): Promise<'shared' | 'copied'> {
  const absoluteUrl = artifact.previewUrl
    ? `${window.location.origin}${artifact.previewUrl}`
    : `${window.location.origin}${artifact.downloadUrl}`;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: artifact.title || artifact.filename,
        text: `NOVA AI Artifact: ${artifact.filename}`,
        url: absoluteUrl,
      });
      return 'shared';
    } catch (_) {}
  }

  await copyTextToClipboard(absoluteUrl);
  return 'copied';
}
