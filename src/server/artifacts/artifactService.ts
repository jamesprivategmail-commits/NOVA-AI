import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import * as esbuild from 'esbuild';
import { doc, setDoc, getDoc, getDocs, deleteDoc, collection, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import {
  ArtifactRecord,
  ArtifactZipEntryInfo,
  ProjectGroupInfo,
} from '../../models/types';
import {
  SUPPORTED_EXTENSIONS,
  getExtensionFromName,
  getMimeTypeForExtension,
  getArtifactKindForExtension,
  isBinaryExtension,
  sanitizeArtifactPath,
  parseArtifactsFromResponse,
} from '../../utils/artifactParser';
import {
  generatePdfBuffer,
  extractTextFromPdfBuffer,
  generateXlsxBuffer,
  parseXlsxBuffer,
  generateDocxBuffer,
  parseDocxBuffer,
  parseCsvRows,
  escapeHtml,
} from './formatHandlers';

export const MAX_SINGLE_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_ZIP_UNCOMPRESSED_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_ZIP_ENTRIES = 500;
const FIRESTORE_CONTENT_LIMIT = 650000; // Stay safely under Firestore 1MB doc limit

const TEXT_EXTENSIONS = new Set([
  'html', 'htm', 'css', 'scss', 'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx',
  'json', 'txt', 'log', 'md', 'markdown', 'csv', 'tsv', 'svg',
  'py', 'sql', 'yaml', 'yml', 'xml', 'sh', 'bash', 'env', 'gitignore',
]);

export class ArtifactService {
  private baseDir: string;
  private memoryCache = new Map<string, ArtifactRecord>();
  private firestoreArtifactsAvailable = true;

  constructor() {
    const preferred = process.env.WORKSPACE_ROOT || path.join(process.cwd(), 'workspaces');
    try {
      if (!fs.existsSync(preferred)) {
        fs.mkdirSync(preferred, { recursive: true });
      }
      this.baseDir = preferred;
    } catch (_) {
      const tmp = path.join('/tmp', 'nova-workspaces');
      if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
      this.baseDir = tmp;
    }
  }

  public sanitizeId(id: string | undefined, fallback: string = 'default'): string {
    if (!id || typeof id !== 'string') return fallback;
    const cleaned = id.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 96);
    return cleaned || fallback;
  }

  private getArtifactDir(userId: string, artifactId: string): string {
    const safeUser = this.sanitizeId(userId, 'workspace-default');
    const safeArt = this.sanitizeId(artifactId);
    const dir = path.join(this.baseDir, '_artifacts', safeUser, safeArt);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private getProjectDir(userId: string, projectId: string): string {
    const safeUser = this.sanitizeId(userId, 'workspace-default');
    const safeProj = this.sanitizeId(projectId);
    const dir = path.join(this.baseDir, '_projects', safeUser, safeProj);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  public resolveSafeChildPath(rootDir: string, relativePath: string): string {
    if (!relativePath || relativePath.includes('..') || path.isAbsolute(relativePath)) {
      throw new Error(`Security Violation: Unsafe archive or artifact path (${relativePath})`);
    }
    const cleanRel = sanitizeArtifactPath(relativePath);
    const resolvedRoot = path.resolve(rootDir);
    const resolvedTarget = path.resolve(resolvedRoot, cleanRel);
    if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(resolvedRoot + path.sep)) {
      throw new Error(`Security Violation: Unsafe archive or artifact path (${relativePath})`);
    }
    return resolvedTarget;
  }

  public validateExtension(filename: string): string {
    const ext = getExtensionFromName(filename);
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      throw new Error(`Unsupported file extension ".${ext}" for ${filename}`);
    }
    return ext;
  }

  private async persistRecord(record: ArtifactRecord, rawBuffer: Buffer): Promise<ArtifactRecord> {
    const dir = this.getArtifactDir(record.userId, record.id);
    const safeFileName = path.basename(sanitizeArtifactPath(record.filename));
    const filePath = path.join(dir, safeFileName);
    const metaPath = path.join(dir, 'manifest.json');

    fs.writeFileSync(filePath, rawBuffer);
    const diskMeta: ArtifactRecord = {
      ...record,
      storageRef: `artifacts/${this.sanitizeId(record.userId, 'workspace-default')}/${record.id}/${safeFileName}`,
    };
    fs.writeFileSync(metaPath, JSON.stringify(diskMeta, null, 2), 'utf-8');
    this.memoryCache.set(record.id, diskMeta);

    // Sync metadata + bounded text content to Firestore when /artifacts rules permit
    if (this.firestoreArtifactsAvailable) {
      try {
        const firestorePayload: Record<string, any> = {
          id: diskMeta.id,
          filename: diskMeta.filename,
          path: diskMeta.path,
          mimeType: diskMeta.mimeType,
          extension: diskMeta.extension,
          kind: diskMeta.kind,
          size: diskMeta.size,
          isBinary: Boolean(diskMeta.isBinary),
          storageRef: diskMeta.storageRef,
          downloadUrl: diskMeta.downloadUrl,
          previewUrl: diskMeta.previewUrl || null,
          createdAt: diskMeta.createdAt,
          updatedAt: diskMeta.updatedAt || diskMeta.createdAt,
          conversationId: diskMeta.conversationId,
          messageId: diskMeta.messageId || null,
          userId: diskMeta.userId,
          groupId: diskMeta.groupId || null,
          projectName: diskMeta.projectName || null,
          title: diskMeta.title || null,
          description: diskMeta.description || null,
          sourceProjectId: diskMeta.sourceProjectId || null,
          fileCount: diskMeta.fileCount ?? null,
          zipEntries: diskMeta.zipEntries ? diskMeta.zipEntries.slice(0, 200) : null,
          modifiedFiles: diskMeta.modifiedFiles || null,
          preservedFiles: diskMeta.preservedFiles ? diskMeta.preservedFiles.slice(0, 200) : null,
          extractedPreview: diskMeta.extractedPreview ? diskMeta.extractedPreview.slice(0, 48000) : null,
        };
        if (diskMeta.content && Buffer.byteLength(diskMeta.content, 'utf8') <= FIRESTORE_CONTENT_LIMIT) {
          firestorePayload.content = diskMeta.content;
        }
        if (diskMeta.base64Data && diskMeta.base64Data.length <= FIRESTORE_CONTENT_LIMIT) {
          firestorePayload.base64Data = diskMeta.base64Data;
        }
        await setDoc(doc(db, 'artifacts', diskMeta.id), firestorePayload, { merge: true });
      } catch (err: any) {
        const msg = String(err?.message || err || '');
        if (msg.includes('PERMISSION_DENIED')) {
          this.firestoreArtifactsAvailable = false;
        } else {
          console.warn('[ArtifactService] Firestore sync warning (disk copy preserved):', msg);
        }
      }
    }

    return diskMeta;
  }

  /**
   * Create and persist a single artifact (handles text, code, images, PDF, XLSX, DOCX, ZIP).
   */
  public async createArtifact(params: {
    userId: string;
    conversationId: string;
    messageId?: string;
    filename: string;
    path?: string;
    content?: string;
    buffer?: Buffer;
    base64Data?: string;
    mimeType?: string;
    title?: string;
    description?: string;
    groupId?: string;
    projectName?: string;
    sourceProjectId?: string;
    zipEntries?: ArtifactZipEntryInfo[];
    fileCount?: number;
    modifiedFiles?: string[];
    preservedFiles?: string[];
    extractedPreview?: string;
  }): Promise<ArtifactRecord> {
    const safeUser = this.sanitizeId(params.userId, 'workspace-default');
    const safeConv = this.sanitizeId(params.conversationId, 'default-chat');
    const cleanPath = sanitizeArtifactPath(params.path || params.filename);
    const filename = path.basename(cleanPath);
    const ext = this.validateExtension(filename);
    const mimeType = params.mimeType || getMimeTypeForExtension(ext);
    const kind = getArtifactKindForExtension(ext);
    const id = `art-${uuidv4().replace(/-/g, '').slice(0, 16)}`;

    let rawBuffer: Buffer;
    let textContent = params.content;
    let base64Str = params.base64Data;
    let extractedPreview = params.extractedPreview;
    const isBinary = isBinaryExtension(ext);

    if (params.buffer) {
      rawBuffer = params.buffer;
    } else if (params.base64Data) {
      const stripped = params.base64Data.replace(/^data:[^;]+;base64,/, '');
      rawBuffer = Buffer.from(stripped, 'base64');
      base64Str = stripped;
    } else if (ext === 'pdf' && typeof params.content === 'string' && !params.content.startsWith('%PDF')) {
      rawBuffer = generatePdfBuffer(params.content, params.title || filename);
      base64Str = rawBuffer.toString('base64');
      extractedPreview = params.content;
    } else if (ext === 'xlsx' && typeof params.content === 'string') {
      rawBuffer = await generateXlsxBuffer(params.content, params.title || 'Sheet1');
      base64Str = rawBuffer.toString('base64');
      extractedPreview = params.content;
    } else if (ext === 'docx' && typeof params.content === 'string') {
      rawBuffer = await generateDocxBuffer(params.content);
      base64Str = rawBuffer.toString('base64');
      extractedPreview = params.content;
    } else {
      const str = params.content ?? '';
      rawBuffer = Buffer.from(str, 'utf8');
      textContent = str;
    }

    if (rawBuffer.length > MAX_SINGLE_FILE_BYTES) {
      throw new Error(`File "${filename}" exceeds maximum allowed size of 25 MB.`);
    }

    // Extract readable previews for uploaded binaries if not already provided
    if (isBinary && !extractedPreview) {
      try {
        if (ext === 'pdf') {
          extractedPreview = extractTextFromPdfBuffer(rawBuffer);
        } else if (ext === 'xlsx') {
          const parsed = await parseXlsxBuffer(rawBuffer);
          extractedPreview = parsed.textSummary;
        } else if (ext === 'docx') {
          const parsed = await parseDocxBuffer(rawBuffer);
          extractedPreview = parsed.text;
        }
      } catch (_) {}
    }

    const now = Date.now();
    const record: ArtifactRecord = {
      id,
      filename,
      path: cleanPath,
      mimeType,
      extension: ext,
      kind,
      size: rawBuffer.length,
      content: !isBinary ? (textContent ?? rawBuffer.toString('utf8')) : undefined,
      base64Data: isBinary && rawBuffer.length <= 400000 ? (base64Str || rawBuffer.toString('base64')) : undefined,
      isBinary,
      storageRef: '',
      downloadUrl: `/api/artifacts/${id}/download?userId=${encodeURIComponent(safeUser)}`,
      previewUrl: `/api/artifacts/${id}/raw?userId=${encodeURIComponent(safeUser)}`,
      createdAt: now,
      updatedAt: now,
      conversationId: safeConv,
      messageId: params.messageId,
      userId: safeUser,
      groupId: params.groupId,
      projectName: params.projectName,
      title: params.title || filename,
      description: params.description,
      sourceProjectId: params.sourceProjectId,
      zipEntries: params.zipEntries,
      fileCount: params.fileCount,
      modifiedFiles: params.modifiedFiles,
      preservedFiles: params.preservedFiles,
      extractedPreview,
    };

    return this.persistRecord(record, rawBuffer);
  }

  /**
   * Safely extracts an uploaded ZIP archive into a persistent project directory
   * with Zip-Slip path traversal protection and uncompressed size limits.
   */
  public async extractZipProject(params: {
    userId: string;
    conversationId: string;
    filename: string;
    zipBuffer: Buffer;
  }): Promise<{
    projectId: string;
    artifact: ArtifactRecord;
    fileTree: string[];
    extractedFiles: { path: string; name: string; size: number; isText: boolean; content?: string }[];
    aiPromptSnippet: string;
    hasHtmlEntry: boolean;
    htmlEntryContent?: string;
  }> {
    if (params.zipBuffer.length === 0) {
      throw new Error('Uploaded ZIP archive is empty.');
    }
    if (params.zipBuffer.length > MAX_ZIP_BYTES) {
      throw new Error('ZIP archive exceeds 50 MB limit.');
    }

    const zip = await JSZip.loadAsync(params.zipBuffer);
    const projectId = `proj-${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const projectDir = this.getProjectDir(params.userId, projectId);

    const entries: { relPath: string; entry: JSZip.JSZipObject }[] = [];
    for (const [rawPath, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      if (rawPath.includes('..') || path.isAbsolute(rawPath)) {
        throw new Error(`Security Violation: Unsafe path inside ZIP archive (${rawPath})`);
      }
      if (rawPath.startsWith('__MACOSX/') || rawPath.split('/').pop()?.startsWith('._')) continue;
      if (rawPath.includes('node_modules/') || rawPath.includes('.git/')) continue;
      entries.push({ relPath: sanitizeArtifactPath(rawPath), entry });
    }

    if (entries.length === 0) {
      throw new Error('ZIP archive contains no valid files.');
    }
    if (entries.length > MAX_ZIP_ENTRIES) {
      throw new Error(`ZIP archive has too many entries (${entries.length} > ${MAX_ZIP_ENTRIES}).`);
    }

    entries.sort((a, b) => a.relPath.localeCompare(b.relPath));

    let totalUncompressed = 0;
    const extractedFiles: { path: string; name: string; size: number; isText: boolean; content?: string }[] = [];
    const fileTree: string[] = [];
    let hasHtmlEntry = false;
    let htmlEntryContent: string | undefined;

    for (const { relPath, entry } of entries) {
      const buf = await entry.async('nodebuffer');
      totalUncompressed += buf.length;
      if (totalUncompressed > MAX_ZIP_UNCOMPRESSED_BYTES) {
        throw new Error('ZIP archive uncompressed size exceeds 100 MB safety limit.');
      }

      const targetPath = this.resolveSafeChildPath(projectDir, relPath);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, buf);

      fileTree.push(relPath);
      const ext = getExtensionFromName(relPath);
      const isText = TEXT_EXTENSIONS.has(ext) || relPath.toLowerCase().endsWith('dockerfile') || relPath.toLowerCase().endsWith('makefile');
      let content: string | undefined;
      if (isText && buf.length <= 250000) {
        content = buf.toString('utf8');
        if (ext === 'html' || ext === 'htm') {
          if (!hasHtmlEntry || relPath.toLowerCase().endsWith('index.html')) {
            hasHtmlEntry = true;
            htmlEntryContent = content;
          }
        }
      }

      extractedFiles.push({
        path: relPath,
        name: path.basename(relPath),
        size: buf.length,
        isText,
        content: content?.slice(0, 16000),
      });
    }

    let aiPromptSnippet = `📦 **ZIP Project Uploaded & Extracted (Project ID: \`${projectId}\`):** \`${params.filename}\`\n`;
    aiPromptSnippet += `- **Total Files:** ${entries.length}\n`;
    aiPromptSnippet += `- **Uncompressed Size:** ${(totalUncompressed / 1024).toFixed(1)} KB\n\n`;
    aiPromptSnippet += `### File Tree:\n\`\`\`\n${fileTree.slice(0, 60).join('\n')}${fileTree.length > 60 ? `\n... and ${fileTree.length - 60} more` : ''}\n\`\`\`\n\n`;
    aiPromptSnippet += `### Extracted File Contents:\n`;
    for (const f of extractedFiles.filter((x) => x.content !== undefined).slice(0, 40)) {
      const ext = getExtensionFromName(f.path);
      aiPromptSnippet += `\n**File: \`${f.path}\`** (${f.size} bytes)\n\`\`\`${ext}\n${f.content}\n\`\`\`\n`;
    }

    const zipEntries: ArtifactZipEntryInfo[] = extractedFiles.map((f) => ({
      path: f.path,
      name: f.name,
      size: f.size,
      isText: f.isText,
    }));

    const artifact = await this.createArtifact({
      userId: params.userId,
      conversationId: params.conversationId,
      filename: params.filename,
      path: params.filename,
      buffer: params.zipBuffer,
      mimeType: 'application/zip',
      title: params.filename,
      sourceProjectId: projectId,
      zipEntries,
      fileCount: entries.length,
      extractedPreview: aiPromptSnippet,
    });

    return {
      projectId,
      artifact,
      fileTree,
      extractedFiles,
      aiPromptSnippet,
      hasHtmlEntry,
      htmlEntryContent,
    };
  }

  /**
   * Commits generated/modified files from an AI response, merges into an uploaded ZIP project if present
   * (preserving all unrelated files intact), and builds a real downloadable ZIP when delivering a project.
   */
  public async commitResponseArtifacts(params: {
    userId: string;
    conversationId: string;
    messageId?: string;
    rawText: string;
    sourceProjectId?: string;
    projectName?: string;
    files?: { path: string; content: string; title?: string; mimeType?: string }[];
  }): Promise<{
    artifacts: ArtifactRecord[];
    zipArtifact?: ArtifactRecord;
    projectGroup?: ProjectGroupInfo;
  }> {
    const parsed = params.rawText ? parseArtifactsFromResponse(params.rawText, false) : { files: [], projectName: undefined };
    const inputFiles = params.files && params.files.length > 0
      ? params.files.map((f) => ({
          path: sanitizeArtifactPath(f.path),
          filename: path.basename(sanitizeArtifactPath(f.path)),
          content: f.content,
          title: f.title,
          mimeType: f.mimeType,
          projectName: params.projectName,
        }))
      : parsed.files;

    if (inputFiles.length === 0) {
      return { artifacts: [] };
    }

    const groupId = `grp-${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const resolvedProjectName = (
      params.projectName ||
      parsed.projectName ||
      (params.sourceProjectId ? 'updated-project' : inputFiles.length > 1 ? 'nova-project' : undefined)
    );

    const shouldCreateZip = Boolean(params.sourceProjectId || inputFiles.length >= 2);
    const projectId = params.sourceProjectId
      ? this.sanitizeId(params.sourceProjectId)
      : shouldCreateZip
      ? `proj-${uuidv4().replace(/-/g, '').slice(0, 12)}`
      : undefined;

    const savedArtifacts: ArtifactRecord[] = [];
    const modifiedFiles: string[] = [];

    for (const file of inputFiles) {
      const cleanPath = sanitizeArtifactPath(file.path || file.filename);
      modifiedFiles.push(cleanPath);

      if (projectId) {
        const projectDir = this.getProjectDir(params.userId, projectId);
        const dest = this.resolveSafeChildPath(projectDir, cleanPath);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, file.content, 'utf8');
      }

      const art = await this.createArtifact({
        userId: params.userId,
        conversationId: params.conversationId,
        messageId: params.messageId,
        filename: path.basename(cleanPath),
        path: cleanPath,
        content: file.content,
        mimeType: file.mimeType,
        title: file.title || path.basename(cleanPath),
        groupId: shouldCreateZip ? groupId : undefined,
        projectName: resolvedProjectName,
        sourceProjectId: projectId,
      });
      savedArtifacts.push(art);
    }

    let zipArtifact: ArtifactRecord | undefined;
    let projectGroup: ProjectGroupInfo | undefined;

    if (shouldCreateZip && projectId) {
      const projectDir = this.getProjectDir(params.userId, projectId);
      const { zipBuffer, entries, preservedFiles } = await this.buildZipFromProjectDir(projectDir, modifiedFiles);
      const zipBaseName = (resolvedProjectName || 'nova-project')
        .replace(/\.zip$/i, '')
        .replace(/[^a-zA-Z0-9_\-\.]/g, '-') || 'nova-project';
      const zipFilename = `${zipBaseName}.zip`;

      zipArtifact = await this.createArtifact({
        userId: params.userId,
        conversationId: params.conversationId,
        messageId: params.messageId,
        filename: zipFilename,
        path: zipFilename,
        buffer: zipBuffer,
        mimeType: 'application/zip',
        title: `${resolvedProjectName || 'Project'} Archive`,
        groupId,
        projectName: resolvedProjectName || zipBaseName,
        sourceProjectId: projectId,
        zipEntries: entries,
        fileCount: entries.length,
        modifiedFiles,
        preservedFiles,
      });

      projectGroup = {
        groupId,
        projectName: resolvedProjectName || zipBaseName,
        sourceProjectId: projectId,
        zipArtifactId: zipArtifact.id,
        zipFilename: zipArtifact.filename,
        zipSize: zipArtifact.size,
        fileCount: entries.length,
        artifactIds: savedArtifacts.map((a) => a.id),
        modifiedFiles,
        preservedFiles,
      };
    }

    return { artifacts: savedArtifacts, zipArtifact, projectGroup };
  }

  private async buildZipFromProjectDir(
    projectDir: string,
    modifiedPaths: string[]
  ): Promise<{ zipBuffer: Buffer; entries: ArtifactZipEntryInfo[]; preservedFiles: string[] }> {
    const zip = new JSZip();
    const entries: ArtifactZipEntryInfo[] = [];
    const modifiedSet = new Set(modifiedPaths.map((p) => sanitizeArtifactPath(p).toLowerCase()));
    const preservedFiles: string[] = [];

    const walk = (dir: string) => {
      const dirEntries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of dirEntries) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else {
          const rel = path.relative(projectDir, full).replace(/\\/g, '/');
          const buf = fs.readFileSync(full);
          zip.file(rel, buf);
          const ext = getExtensionFromName(rel);
          const isText = TEXT_EXTENSIONS.has(ext);
          entries.push({
            path: rel,
            name: entry.name,
            size: buf.length,
            isText,
          });
          if (!modifiedSet.has(rel.toLowerCase())) {
            preservedFiles.push(rel);
          }
        }
      }
    };

    walk(projectDir);

    if (entries.length === 0) {
      throw new Error('Cannot generate empty project ZIP archive.');
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    if (zipBuffer.length <= 22) {
      throw new Error('Generated ZIP archive failed integrity verification.');
    }

    return { zipBuffer, entries, preservedFiles };
  }

  /**
   * Bundles arbitrary artifact IDs into a single downloadable ZIP archive.
   */
  public async buildZipFromArtifacts(params: {
    userId: string;
    conversationId: string;
    artifactIds: string[];
    projectName?: string;
  }): Promise<ArtifactRecord> {
    const zip = new JSZip();
    const entries: ArtifactZipEntryInfo[] = [];

    for (const id of params.artifactIds) {
      const loaded = await this.getArtifactWithBuffer(id, params.userId);
      if (!loaded) continue;
      if (loaded.record.extension === 'zip') continue;
      const relPath = sanitizeArtifactPath(loaded.record.path || loaded.record.filename);
      zip.file(relPath, loaded.buffer);
      entries.push({
        path: relPath,
        name: loaded.record.filename,
        size: loaded.buffer.length,
        isText: !loaded.record.isBinary,
      });
    }

    if (entries.length === 0) {
      throw new Error('No valid files found to bundle into ZIP archive.');
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const baseName = (params.projectName || 'nova-bundle').replace(/\.zip$/i, '').replace(/[^a-zA-Z0-9_\-\.]/g, '-') || 'nova-bundle';

    return this.createArtifact({
      userId: params.userId,
      conversationId: params.conversationId,
      filename: `${baseName}.zip`,
      path: `${baseName}.zip`,
      buffer: zipBuffer,
      mimeType: 'application/zip',
      title: `${baseName}.zip`,
      projectName: baseName,
      zipEntries: entries,
      fileCount: entries.length,
    });
  }

  public async getArtifact(id: string, userId?: string): Promise<ArtifactRecord | null> {
    const loaded = await this.getArtifactWithBuffer(id, userId);
    return loaded ? loaded.record : null;
  }

  public async getArtifactWithBuffer(
    id: string,
    userId?: string
  ): Promise<{ record: ArtifactRecord; buffer: Buffer } | null> {
    const safeId = this.sanitizeId(id);

    // 1. Check in-memory cache + disk
    const cached = this.memoryCache.get(safeId);
    if (cached) {
      if (userId && cached.userId !== this.sanitizeId(userId, 'workspace-default') && userId !== cached.userId) {
        // Enforce user ownership when userId is provided
        return null;
      }
      const dir = this.getArtifactDir(cached.userId, safeId);
      const filePath = path.join(dir, path.basename(sanitizeArtifactPath(cached.filename)));
      if (fs.existsSync(filePath)) {
        return { record: cached, buffer: fs.readFileSync(filePath) };
      }
    }

    // 2. Scan user disk directory if userId provided
    if (userId) {
      const safeUser = this.sanitizeId(userId, 'workspace-default');
      const dir = path.join(this.baseDir, '_artifacts', safeUser, safeId);
      const metaPath = path.join(dir, 'manifest.json');
      if (fs.existsSync(metaPath)) {
        try {
          const record = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as ArtifactRecord;
          const filePath = path.join(dir, path.basename(sanitizeArtifactPath(record.filename)));
          if (fs.existsSync(filePath)) {
            this.memoryCache.set(safeId, record);
            return { record, buffer: fs.readFileSync(filePath) };
          }
        } catch (_) {}
      }
    }

    // 3. Fallback scan across _artifacts/<user>/<safeId> if no userId query param (for direct raw/share links)
    const artifactsRoot = path.join(this.baseDir, '_artifacts');
    if (fs.existsSync(artifactsRoot)) {
      for (const userDir of fs.readdirSync(artifactsRoot)) {
        const candidateDir = path.join(artifactsRoot, userDir, safeId);
        const metaPath = path.join(candidateDir, 'manifest.json');
        if (fs.existsSync(metaPath)) {
          try {
            const record = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as ArtifactRecord;
            if (userId && record.userId !== this.sanitizeId(userId, 'workspace-default') && record.userId !== userId) {
              return null;
            }
            const filePath = path.join(candidateDir, path.basename(sanitizeArtifactPath(record.filename)));
            if (fs.existsSync(filePath)) {
              this.memoryCache.set(safeId, record);
              return { record, buffer: fs.readFileSync(filePath) };
            }
          } catch (_) {}
        }
      }
    }

    // 4. Fallback to Firestore record
    try {
      const snap = await getDoc(doc(db, 'artifacts', safeId));
      if (snap.exists()) {
        const record = snap.data() as ArtifactRecord;
        if (userId && record.userId !== this.sanitizeId(userId, 'workspace-default') && record.userId !== userId) {
          return null;
        }
        const buf = record.base64Data
          ? Buffer.from(record.base64Data, 'base64')
          : Buffer.from(record.content || record.extractedPreview || '', 'utf8');
        this.memoryCache.set(safeId, record);
        return { record, buffer: buf };
      }
    } catch (_) {}

    return null;
  }

  public async listArtifacts(params: { userId?: string; conversationId?: string }): Promise<ArtifactRecord[]> {
    const results = new Map<string, ArtifactRecord>();
    const safeUser = params.userId ? this.sanitizeId(params.userId, 'workspace-default') : undefined;
    const safeConv = params.conversationId ? this.sanitizeId(params.conversationId, 'default-chat') : undefined;

    // 1. Read from disk
    const artifactsRoot = path.join(this.baseDir, '_artifacts');
    if (fs.existsSync(artifactsRoot)) {
      const userDirs = safeUser ? [safeUser] : fs.readdirSync(artifactsRoot);
      for (const uDir of userDirs) {
        const uPath = path.join(artifactsRoot, uDir);
        if (!fs.existsSync(uPath) || !fs.statSync(uPath).isDirectory()) continue;
        for (const artDir of fs.readdirSync(uPath)) {
          const metaPath = path.join(uPath, artDir, 'manifest.json');
          if (fs.existsSync(metaPath)) {
            try {
              const rec = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as ArtifactRecord;
              if (safeConv && rec.conversationId !== safeConv && rec.conversationId !== params.conversationId) continue;
              results.set(rec.id, rec);
            } catch (_) {}
          }
        }
      }
    }

    // 2. Merge from Firestore
    try {
      const constraints: any[] = [];
      if (safeUser) constraints.push(where('userId', '==', safeUser));
      if (safeConv) constraints.push(where('conversationId', '==', safeConv));
      if (constraints.length > 0) {
        const q = query(collection(db, 'artifacts'), ...constraints);
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          const rec = d.data() as ArtifactRecord;
          if (!results.has(rec.id)) {
            results.set(rec.id, rec);
          }
        }
      }
    } catch (_) {}

    return Array.from(results.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  public async updateArtifactContent(id: string, userId: string, newContent: string): Promise<ArtifactRecord | null> {
    const existing = await this.getArtifactWithBuffer(id, userId);
    if (!existing) return null;

    const record = existing.record;
    const rawBuffer = Buffer.from(newContent, 'utf8');
    const updated: ArtifactRecord = {
      ...record,
      content: newContent,
      size: rawBuffer.length,
      updatedAt: Date.now(),
    };

    if (record.sourceProjectId) {
      const projDir = this.getProjectDir(userId, record.sourceProjectId);
      const dest = this.resolveSafeChildPath(projDir, record.path || record.filename);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, rawBuffer);
    }

    return this.persistRecord(updated, rawBuffer);
  }

  public async rebindArtifactsToConversation(
    userId: string,
    artifactIds: string[],
    conversationId: string
  ): Promise<ArtifactRecord[]> {
    const safeConv = this.sanitizeId(conversationId, 'default-chat');
    const updatedList: ArtifactRecord[] = [];
    for (const id of artifactIds) {
      const existing = await this.getArtifactWithBuffer(id, userId);
      if (!existing) continue;
      if (existing.record.conversationId === safeConv) {
        updatedList.push(existing.record);
        continue;
      }
      const updated: ArtifactRecord = {
        ...existing.record,
        conversationId: safeConv,
        updatedAt: Date.now(),
      };
      const saved = await this.persistRecord(updated, existing.buffer);
      updatedList.push(saved);
    }
    return updatedList;
  }

  public async deleteArtifact(id: string, userId?: string): Promise<boolean> {
    const existing = await this.getArtifactWithBuffer(id, userId);
    if (!existing) return false;
    const rec = existing.record;
    const dir = path.join(this.baseDir, '_artifacts', rec.userId, rec.id);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    this.memoryCache.delete(rec.id);
    try {
      await deleteDoc(doc(db, 'artifacts', rec.id));
    } catch (_) {}
    return true;
  }

  public async extractZipEntriesForInspector(id: string, userId?: string) {
    const loaded = await this.getArtifactWithBuffer(id, userId);
    if (!loaded || loaded.record.extension !== 'zip') return null;

    const zip = await JSZip.loadAsync(loaded.buffer);
    const extractedFiles: { path: string; name: string; size: number; isText: boolean; content?: string }[] = [];
    const fileTree: string[] = [];
    let totalSize = 0;
    let hasHtmlEntry = false;
    let htmlEntryContent: string | undefined;
    let htmlEntryPath: string | undefined;

    for (const [relPath, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      if (relPath.startsWith('__MACOSX/')) continue;
      const buf = await entry.async('nodebuffer');
      totalSize += buf.length;
      fileTree.push(relPath);
      const ext = getExtensionFromName(relPath);
      const isText = TEXT_EXTENSIONS.has(ext);
      let content: string | undefined;
      if (isText && buf.length <= 300000) {
        content = buf.toString('utf8');
        if (ext === 'html' || ext === 'htm') {
          if (!hasHtmlEntry || relPath.toLowerCase().endsWith('index.html')) {
            hasHtmlEntry = true;
            htmlEntryContent = content;
            htmlEntryPath = relPath;
          }
        }
      }
      extractedFiles.push({
        path: relPath,
        name: path.basename(relPath),
        size: buf.length,
        isText,
        content,
      });
    }

    extractedFiles.sort((a, b) => a.path.localeCompare(b.path));
    fileTree.sort();

    return {
      fileName: loaded.record.filename,
      totalFiles: extractedFiles.length,
      totalSize,
      fileTree,
      extractedFiles,
      aiPromptSnippet: loaded.record.extractedPreview || '',
      hasHtmlEntry,
      htmlEntryContent,
      htmlEntryPath,
    };
  }

  /**
   * Compiles any previewable artifact (HTML, React JSX/TSX, CSS, JS, SVG, Markdown, CSV, XLSX, DOCX, JSON)
   * into a self-contained sandboxed HTML document that runs offline without external CDNs.
   */
  public async compilePreviewHtml(params: {
    artifact?: ArtifactRecord;
    buffer?: Buffer;
    siblings?: ArtifactRecord[];
    inlineContent?: string;
    inlineFilename?: string;
  }): Promise<string> {
    const filename = params.artifact?.filename || params.inlineFilename || 'preview.html';
    const ext = getExtensionFromName(filename);
    const kind = params.artifact?.kind || getArtifactKindForExtension(ext);
    const content = params.inlineContent ?? params.artifact?.content ?? (params.buffer ? params.buffer.toString('utf8') : '');

    const consoleBridge = `<script>
(function() {
  var oLog = console.log, oWarn = console.warn, oErr = console.error;
  function emit(type, args) {
    try {
      var text = Array.prototype.slice.call(args).map(function(a) {
        if (typeof a === 'object') { try { return JSON.stringify(a); } catch(_) { return String(a); } }
        return String(a);
      }).join(' ');
      window.parent.postMessage({ source: 'void-sandbox-console', type: type, text: text, time: new Date().toLocaleTimeString() }, '*');
    } catch (_) {}
  }
  console.log = function() { emit('log', arguments); oLog.apply(console, arguments); };
  console.warn = function() { emit('warn', arguments); oWarn.apply(console, arguments); };
  console.error = function() { emit('error', arguments); oErr.apply(console, arguments); };
  window.addEventListener('error', function(e) { emit('error', [e.message || 'Runtime error']); });
})();
</script>`;

    if (kind === 'html') {
      let html = content || '<!doctype html><html><body></body></html>';
      const cssSiblings = (params.siblings || []).filter((s) => s.kind === 'css' && s.content && s.filename !== filename);
      const jsSiblings = (params.siblings || []).filter((s) => s.kind === 'javascript' && s.content && s.filename !== filename);

      for (const s of cssSiblings) {
        const escapedName = s.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp(`<link[^>]+href=["'](?:\\.\\/|\\/)?${escapedName}["'][^>]*>`, 'gi'), '');
      }
      for (const s of jsSiblings) {
        const escapedName = s.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp(`<script[^>]+src=["'](?:\\.\\/|\\/)?${escapedName}["'][^>]*>\\s*<\\/script>`, 'gi'), '');
      }

      const siblingCss = cssSiblings
        .map((s) => `<style data-artifact="${escapeHtml(s.filename)}">\n${s.content}\n</style>`)
        .join('\n');
      const siblingJs = jsSiblings
        .map((s) => `<script data-artifact="${escapeHtml(s.filename)}">\n${s.content}\n</script>`)
        .join('\n');

      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head([^>]*)>/i, `<head$1>\n${consoleBridge}\n${siblingCss}`);
      } else {
        html = `<!doctype html><html><head><meta charset="utf-8">${consoleBridge}${siblingCss}</head><body>${html}</body></html>`;
      }
      if (siblingJs && /<\/body>/i.test(html)) {
        html = html.replace(/<\/body>/i, `${siblingJs}\n</body>`);
      } else if (siblingJs) {
        html += `\n${siblingJs}`;
      }
      return html;
    }

    if (kind === 'svg') {
      return `<!doctype html><html><head><meta charset="utf-8">${consoleBridge}<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#faf8f4;padding:24px;box-sizing:border-box;}svg{max-width:100%;max-height:85vh;height:auto;}</style></head><body>${content}</body></html>`;
    }

    if (kind === 'react' || ext === 'jsx' || ext === 'tsx') {
      return this.compileReactSandboxHtml(content, filename, params.siblings || [], consoleBridge);
    }

    if (kind === 'css') {
      return `<!doctype html><html><head><meta charset="utf-8">${consoleBridge}<style>body{font-family:system-ui,sans-serif;padding:24px;line-height:1.6;}${content}</style></head><body><div class="container preview-root"><h1>${escapeHtml(filename)} Preview</h1><p>Sample paragraph, <a href="#">interactive link</a>, and primary action button styled by your stylesheet.</p><button class="btn primary">Action Button</button><div class="card"><h3>Card Surface</h3><p>Live CSS preview container.</p></div></div></body></html>`;
    }

    if (kind === 'javascript' || kind === 'typescript') {
      const transformed = esbuild.transformSync(content, { loader: ext === 'ts' ? 'ts' : 'js' }).code;
      return `<!doctype html><html><head><meta charset="utf-8">${consoleBridge}<style>body{font-family:ui-monospace,monospace;background:#161412;color:#f5efe6;padding:20px;font-size:13px;line-height:1.5;}pre{white-space:pre-wrap;}</style></head><body><div id="app"></div><pre id="out"></pre><script>
(function(){
  var out = document.getElementById('out');
  var oldLog = console.log;
  console.log = function(){
    oldLog.apply(console, arguments);
    out.textContent += Array.prototype.slice.call(arguments).map(function(x){ return typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x); }).join(' ') + '\\n';
  };
  try { ${transformed} } catch (e) { console.error(e.message || e); out.textContent += 'Error: ' + (e.message || e); }
})();
</script></body></html>`;
    }

    if (kind === 'csv' || kind === 'xlsx') {
      let rows: string[][] = [];
      if (kind === 'xlsx' && params.buffer) {
        try {
          const parsed = await parseXlsxBuffer(params.buffer);
          rows = parsed.sheets[0]?.rows || [];
        } catch (_) {}
      }
      if (rows.length === 0) {
        rows = parseCsvRows(params.artifact?.extractedPreview || content);
      }
      const headerRow = rows[0] || [];
      const bodyRows = rows.slice(1, 250);
      return `<!doctype html><html><head><meta charset="utf-8">${consoleBridge}<style>body{margin:0;font-family:system-ui,sans-serif;background:#faf8f4;color:#1f1b18;padding:16px;}table{width:100%;border-collapse:collapse;font-size:12px;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);}th,td{padding:8px 12px;border:1px solid #e7e0d4;text-align:left;}th{background:#f3ede2;font-weight:600;}</style></head><body><table><thead><tr>${headerRow.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${bodyRows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
    }

    if (kind === 'docx') {
      let paragraphs: string[] = [];
      if (params.buffer) {
        try {
          const parsed = await parseDocxBuffer(params.buffer);
          paragraphs = parsed.paragraphs;
        } catch (_) {}
      }
      if (paragraphs.length === 0) {
        paragraphs = (params.artifact?.extractedPreview || content).split('\n').filter(Boolean);
      }
      return `<!doctype html><html><head><meta charset="utf-8">${consoleBridge}<style>body{margin:0;font-family:Georgia,serif;background:#f4efe6;color:#1f1b18;padding:28px;}article{max-width:720px;margin:0 auto;background:#fff;padding:40px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.06);line-height:1.7;}</style></head><body><article>${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}</article></body></html>`;
    }

    if (kind === 'image') {
      const mime = params.artifact?.mimeType || getMimeTypeForExtension(ext);
      const b64 = params.buffer
        ? params.buffer.toString('base64')
        : (params.artifact?.base64Data || '').replace(/^data:[^;]+;base64,/, '');
      const src = b64 ? `data:${mime};base64,${b64}` : (params.artifact?.previewUrl || params.artifact?.downloadUrl || '');
      return `<!doctype html><html><head><meta charset="utf-8">${consoleBridge}<style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:#161412;color:#e7e0d4;font-family:system-ui,sans-serif;padding:24px;box-sizing:border-box;}img{max-width:100%;max-height:85vh;object-fit:contain;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.45);background:repeating-conic-gradient(#26221f 0% 25%,#1e1b18 0% 50%) 50% / 16px 16px;}</style></head><body><img src="${escapeHtml(src)}" alt="${escapeHtml(filename)}" /><span style="font-size:11px;opacity:0.7;">${escapeHtml(filename)}</span></body></html>`;
    }

    if (kind === 'pdf') {
      const b64 = params.buffer
        ? params.buffer.toString('base64')
        : (params.artifact?.base64Data || '').replace(/^data:[^;]+;base64,/, '');
      const extracted = params.artifact?.extractedPreview || (params.buffer ? extractTextFromPdfBuffer(params.buffer) : '');
      const pdfUri = b64 ? `data:application/pdf;base64,${b64}` : '';
      return `<!doctype html><html><head><meta charset="utf-8">${consoleBridge}<style>body{margin:0;min-height:100vh;background:#1b1816;color:#f4efe6;font-family:system-ui,sans-serif;display:flex;flex-direction:column;}embed{width:100%;height:78vh;border:none;background:#24201d;}section{padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;line-height:1.6;}pre{white-space:pre-wrap;margin:6px 0 0;opacity:0.85;font-family:ui-monospace,monospace;}</style></head><body>${pdfUri ? `<embed src="${pdfUri}" type="application/pdf" />` : ''}${extracted ? `<section><strong>Extracted Document Text</strong><pre>${escapeHtml(extracted)}</pre></section>` : ''}</body></html>`;
    }

    if (kind === 'json') {
      let pretty = content;
      try {
        pretty = JSON.stringify(JSON.parse(content), null, 2);
      } catch (_) {}
      return `<!doctype html><html><head><meta charset="utf-8">${consoleBridge}<style>body{margin:0;font-family:ui-monospace,monospace;background:#191614;color:#f4efe6;padding:18px;font-size:12px;line-height:1.55;}pre{margin:0;white-space:pre-wrap;}</style></head><body><pre>${escapeHtml(pretty)}</pre></body></html>`;
    }

    // Markdown or text
    const htmlBody = escapeHtml(content)
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');

    return `<!doctype html><html><head><meta charset="utf-8">${consoleBridge}<style>body{margin:0;font-family:system-ui,sans-serif;background:#faf8f4;color:#1f1b18;padding:24px;line-height:1.65;}code{background:#eee7da;padding:2px 6px;border-radius:4px;font-family:ui-monospace,monospace;font-size:0.9em;}</style></head><body><p>${htmlBody}</p></body></html>`;
  }

  private async compileReactSandboxHtml(
    code: string,
    filename: string,
    siblings: ArtifactRecord[],
    consoleBridge: string
  ): Promise<string> {
    const ext = getExtensionFromName(filename) === 'tsx' ? 'tsx' : 'jsx';
    const siblingCss = siblings
      .filter((s) => s.kind === 'css' && s.content)
      .map((s) => `<style>\n${s.content}\n</style>`)
      .join('\n');

    // Detect exported component name
    const defaultExportMatch = code.match(/export\s+default\s+(?:function|class)\s+([A-Z][a-zA-Z0-9_]*)/);
    const namedFnMatch = code.match(/(?:function|const)\s+([A-Z][a-zA-Z0-9_]*)\s*(?:=|\()/);
    const hasDefaultExport = /export\s+default\s+/.test(code);

    const entrySource = hasDefaultExport
      ? `import React from 'react';
import { createRoot } from 'react-dom/client';
import TargetComponent from './entry.${ext}';
const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(React.createElement(TargetComponent));
}`
      : `import React from 'react';
import { createRoot } from 'react-dom/client';
import * as Mod from './entry.${ext}';
const Comp = Mod.${defaultExportMatch?.[1] || namedFnMatch?.[1] || 'App'} || Object.values(Mod).find(v => typeof v === 'function');
const rootEl = document.getElementById('root');
if (rootEl && Comp) {
  createRoot(rootEl).render(React.createElement(Comp));
}`;

    const virtualPlugin: esbuild.Plugin = {
      name: 'nova-virtual-sandbox',
      setup(build) {
        build.onResolve({ filter: /^virtual:entry$/ }, () => ({ path: 'virtual:entry', namespace: 'nova-vfs' }));
        build.onResolve({ filter: new RegExp(`^\\./entry\\.${ext}$`) }, () => ({
          path: `entry.${ext}`,
          namespace: 'nova-vfs',
        }));
        build.onResolve({ filter: /\.css$/ }, (args) => ({
          path: args.path,
          namespace: 'nova-css-ignore',
        }));
        build.onLoad({ filter: /.*/, namespace: 'nova-css-ignore' }, () => ({
          contents: '',
          loader: 'css',
        }));
        build.onLoad({ filter: /^virtual:entry$/, namespace: 'nova-vfs' }, () => ({
          contents: entrySource,
          loader: ext,
          resolveDir: process.cwd(),
        }));
        build.onLoad({ filter: new RegExp(`^entry\\.${ext}$`), namespace: 'nova-vfs' }, () => ({
          contents: code,
          loader: ext,
          resolveDir: process.cwd(),
        }));
      },
    };

    try {
      const result = await esbuild.build({
        entryPoints: ['virtual:entry'],
        bundle: true,
        write: false,
        format: 'iife',
        platform: 'browser',
        jsx: 'automatic',
        plugins: [virtualPlugin],
        define: { 'process.env.NODE_ENV': '"production"' },
      });
      const bundledJs = result.outputFiles?.[0]?.text || '';
      return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${consoleBridge}
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #ffffff; color: #18181b; }
  </style>
  ${siblingCss}
</head>
<body>
  <div id="root"></div>
  <script>${bundledJs.replace(/<\/script>/gi, '<\\/script>')}</script>
</body>
</html>`;
    } catch (err: any) {
      return `<!doctype html><html><head><meta charset="utf-8">${consoleBridge}<style>body{font-family:ui-monospace,monospace;padding:20px;background:#1c1614;color:#fda4af;font-size:12px;}</style></head><body><h3>React Preview Compile Error</h3><pre>${escapeHtml(err?.message || String(err))}</pre></body></html>`;
    }
  }
}

export const artifactService = new ArtifactService();
