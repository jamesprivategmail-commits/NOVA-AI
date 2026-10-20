import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { WorkspaceFileInfo } from '../../models/types';

export class WorkspaceService {
  private baseDir: string;

  constructor() {
    // Choose writable directory: environment variable -> local workspaces folder -> /tmp/workspaces
    const preferredPath = process.env.WORKSPACE_ROOT || path.join(process.cwd(), 'workspaces');
    try {
      if (!fs.existsSync(preferredPath)) {
        fs.mkdirSync(preferredPath, { recursive: true });
      }
      this.baseDir = preferredPath;
    } catch (err) {
      // In serverless / read-only filesystems (e.g., Vercel root), fallback to /tmp
      const tmpPath = path.join('/tmp', 'nova-workspaces');
      if (!fs.existsSync(tmpPath)) {
        fs.mkdirSync(tmpPath, { recursive: true });
      }
      this.baseDir = tmpPath;
    }
  }

  /**
   * Sanitizes a userId for safe path usage
   */
  private sanitizeUserId(userId?: string): string {
    if (!userId || typeof userId !== 'string') return 'workspace-default';
    const clean = userId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 48);
    return clean || 'workspace-default';
  }

  /**
   * Get user's workspace directory path, creating it if needed
   */
  public getWorkspaceDir(userId?: string): string {
    const safeId = this.sanitizeUserId(userId);
    const userDir = path.join(this.baseDir, safeId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
      this.initializeDefaultWorkspace(userDir, safeId);
    }
    return userDir;
  }

  /**
   * Resolves a relative path safely inside user's workspace, preventing directory traversal
   */
  public resolveSafePath(userId: string | undefined, relativePath: string): string {
    const root = this.getWorkspaceDir(userId);
    const normalized = path.normalize(relativePath || '.').replace(/^(\.\.(\/|\\|$))+/, '');
    const absolute = path.resolve(root, normalized);

    if (!absolute.startsWith(root)) {
      throw new Error(`Security Violation: Path traversal outside workspace (${relativePath})`);
    }

    return absolute;
  }

  /**
   * Initialize a default starter workspace with README and project files
   */
  private initializeDefaultWorkspace(userDir: string, userId: string) {
    try {
      const readmePath = path.join(userDir, 'README.md');
      if (!fs.existsSync(readmePath)) {
        const readmeContent = `# NOVA AI Persistent Workspace\n\nWelcome to your dedicated autonomous execution environment.\n\n- **Workspace ID:** \`${userId}\`\n- **Platform:** Linux bash/sh sandbox\n- **Capabilities:** Autonomous development, npm/pip package management, process daemonization, temporary web preview links, and Git integration.\n\nType requests in chat to have Nova AI build apps, run scripts, test endpoints, or launch background servers.\n`;
        fs.writeFileSync(readmePath, readmeContent, 'utf-8');
      }

      const packageJsonPath = path.join(userDir, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        const pkgContent = JSON.stringify({
          name: `nova-workspace-${userId.slice(0, 8)}`,
          version: '1.0.0',
          description: 'Autonomous development workspace managed by Nova AI',
          main: 'index.js',
          scripts: {
            start: 'node index.js',
            test: 'echo "Tests passed!" && exit 0'
          },
          dependencies: {}
        }, null, 2);
        fs.writeFileSync(packageJsonPath, pkgContent, 'utf-8');
      }

      const indexJsPath = path.join(userDir, 'index.js');
      if (!fs.existsSync(indexJsPath)) {
        const indexContent = `// Nova AI Workspace Entrypoint\nconsole.log('NOVA AI Workspace active. Ready for autonomous tasks.');\n`;
        fs.writeFileSync(indexJsPath, indexContent, 'utf-8');
      }
    } catch (e) {
      console.warn('[Workspace] Could not write default files:', e);
    }
  }

  /**
   * List files in user's workspace
   */
  public async listFiles(userId?: string, subDir: string = '', maxDepth: number = 4): Promise<WorkspaceFileInfo[]> {
    const root = this.getWorkspaceDir(userId);
    const targetDir = this.resolveSafePath(userId, subDir);

    if (!fs.existsSync(targetDir)) {
      return [];
    }

    const traverse = (dir: string, currentDepth: number): WorkspaceFileInfo[] => {
      if (currentDepth > maxDepth) return [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const results: WorkspaceFileInfo[] = [];

      for (const entry of entries) {
        // Skip hidden git internals and large vendor dirs in top-level recursive listing for speed
        if (entry.name === '.git' && currentDepth === 0) continue;
        if (entry.name === 'node_modules' && currentDepth > 0) continue;

        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(root, fullPath).replace(/\\/g, '/');

        try {
          const stats = fs.statSync(fullPath);
          const isDir = entry.isDirectory();

          const fileInfo: WorkspaceFileInfo = {
            name: entry.name,
            path: relPath,
            isDirectory: isDir,
            size: stats.size,
            modifiedAt: stats.mtimeMs,
            extension: isDir ? undefined : path.extname(entry.name).slice(1),
          };

          if (isDir && currentDepth < maxDepth) {
            fileInfo.children = traverse(fullPath, currentDepth + 1);
          }

          results.push(fileInfo);
        } catch (_) {}
      }

      return results.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    };

    return traverse(targetDir, 0);
  }

  /**
   * Read file content from user workspace
   */
  public async readFile(userId: string | undefined, relativePath: string): Promise<string> {
    const filePath = this.resolveSafePath(userId, relativePath);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${relativePath}`);
    }
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      throw new Error(`Target is a directory: ${relativePath}`);
    }
    // Limit single file read to 2MB to prevent memory exhaustion
    if (stat.size > 2 * 1024 * 1024) {
      throw new Error(`File is too large (${(stat.size / 1024 / 1024).toFixed(1)}MB). Max read size is 2MB.`);
    }
    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Write file to user workspace (auto-creates parent directories)
   */
  public async writeFile(userId: string | undefined, relativePath: string, content: string): Promise<void> {
    const filePath = this.resolveSafePath(userId, relativePath);
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Delete file or directory from user workspace
   */
  public async deleteFile(userId: string | undefined, relativePath: string): Promise<boolean> {
    const targetPath = this.resolveSafePath(userId, relativePath);
    if (!fs.existsSync(targetPath)) {
      return false;
    }
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(targetPath);
    }
    return true;
  }

  /**
   * Package entire workspace into a downloadable ZIP archive
   */
  public async exportZip(userId?: string): Promise<Buffer> {
    const root = this.getWorkspaceDir(userId);
    const zip = new JSZip();

    const addFilesToZip = (dir: string, zipFolder: JSZip) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const sub = zipFolder.folder(entry.name);
          if (sub) addFilesToZip(fullPath, sub);
        } else {
          try {
            const data = fs.readFileSync(fullPath);
            zipFolder.file(entry.name, data);
          } catch (_) {}
        }
      }
    };

    addFilesToZip(root, zip);
    return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  /**
   * Import a ZIP archive buffer directly into the user workspace
   */
  public async importZip(userId: string | undefined, zipBuffer: Buffer): Promise<{ fileCount: number }> {
    const root = this.getWorkspaceDir(userId);
    const zip = await JSZip.loadAsync(zipBuffer);
    let count = 0;

    for (const [relPath, file] of Object.entries(zip.files)) {
      if (file.dir) continue;
      const safePath = this.resolveSafePath(userId, relPath);
      const parentDir = path.dirname(safePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      const content = await file.async('nodebuffer');
      fs.writeFileSync(safePath, content);
      count++;
    }

    return { fileCount: count };
  }
}

export const workspaceService = new WorkspaceService();
