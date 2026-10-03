import fs from 'fs';
import path from 'path';

export interface SearchMatch {
  file: string;
  line: number;
  snippet: string;
  match: string;
}

export interface SymbolDefinition {
  file: string;
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'const' | 'export';
  line: number;
  preview: string;
}

export interface DependencyTrace {
  file: string;
  imports: string[];
  importedBy: string[];
  exports: string[];
}

export interface CodebaseSearchOptions {
  maxResults?: number;
  includeLocal?: boolean;
  repoFiles?: { path: string; content?: string }[];
}

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.base44',
  'coverage',
  '.next'
]);

const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.css',
  '.html',
  '.md'
]);

export class CodebaseSearchService {
  private localFilesCache: string[] | null = null;
  private localFilesCacheTime = 0;

  /**
   * Recursively get all code files in the local workspace
   */
  public getLocalFileList(baseDir: string = process.cwd()): string[] {
    const now = Date.now();
    if (this.localFilesCache && now - this.localFilesCacheTime < 10000) {
      return this.localFilesCache;
    }

    const results: string[] = [];

    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

          if (entry.isDirectory()) {
            if (!EXCLUDE_DIRS.has(entry.name)) {
              walk(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (ALLOWED_EXTENSIONS.has(ext)) {
              results.push(relPath);
            }
          }
        }
      } catch (_) {}
    };

    walk(baseDir);
    this.localFilesCache = results;
    this.localFilesCacheTime = now;
    return results;
  }

  /**
   * Search files by filename pattern
   */
  public searchFilenames(query: string, options: CodebaseSearchOptions = {}): string[] {
    const q = query.toLowerCase().trim();
    const files = options.repoFiles
      ? options.repoFiles.map((f) => f.path)
      : this.getLocalFileList();

    const max = options.maxResults || 20;

    return files
      .filter((file) => file.toLowerCase().includes(q))
      .slice(0, max);
  }

  /**
   * Full-text search inside file contents
   */
  public fullTextSearch(query: string, options: CodebaseSearchOptions = {}): SearchMatch[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const matches: SearchMatch[] = [];
    const max = options.maxResults || 25;

    if (options.repoFiles && options.repoFiles.length > 0) {
      for (const item of options.repoFiles) {
        if (!item.content) continue;
        const lines = item.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(q)) {
            matches.push({
              file: item.path,
              line: i + 1,
              match: lines[i].trim(),
              snippet: lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 2)).join('\n')
            });
            if (matches.length >= max) return matches;
          }
        }
      }
      return matches;
    }

    // Local file search
    const files = this.getLocalFileList();
    for (const relPath of files) {
      try {
        const content = fs.readFileSync(relPath, 'utf8');
        if (!content.toLowerCase().includes(q)) continue;

        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(q)) {
            matches.push({
              file: relPath,
              line: i + 1,
              match: lines[i].trim(),
              snippet: lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 2)).join('\n')
            });
            if (matches.length >= max) return matches;
          }
        }
      } catch (_) {}
    }

    return matches;
  }

  /**
   * Symbol & Function Search: Find declarations of functions, classes, interfaces, types
   */
  public searchSymbols(symbolName: string, options: CodebaseSearchOptions = {}): SymbolDefinition[] {
    const target = symbolName.trim();
    if (!target) return [];

    const symbolRegex = new RegExp(
      `(?:export\\s+)?(?:async\\s+)?(function|class|interface|type|const)\\s+(${target})\\b`,
      'g'
    );

    const results: SymbolDefinition[] = [];
    const max = options.maxResults || 20;

    const files = options.repoFiles
      ? options.repoFiles.map((f) => f.path)
      : this.getLocalFileList();

    for (const file of files) {
      let content = '';
      if (options.repoFiles) {
        const rf = options.repoFiles.find((f) => f.path === file);
        content = rf?.content || '';
      } else {
        try {
          content = fs.readFileSync(file, 'utf8');
        } catch (_) {
          continue;
        }
      }

      if (!content.includes(target)) continue;

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        symbolRegex.lastIndex = 0;
        const match = symbolRegex.exec(line);
        if (match) {
          results.push({
            file,
            name: match[2],
            kind: match[1] as any,
            line: i + 1,
            preview: line.trim()
          });
          if (results.length >= max) return results;
        }
      }
    }

    return results;
  }

  /**
   * Reference Search: Find where a function or symbol is used/called
   */
  public findReferences(symbolName: string, options: CodebaseSearchOptions = {}): SearchMatch[] {
    const target = symbolName.trim();
    if (!target) return [];

    const refRegex = new RegExp(`\\b${target}\\b`);
    const results: SearchMatch[] = [];
    const max = options.maxResults || 30;

    const files = options.repoFiles
      ? options.repoFiles.map((f) => f.path)
      : this.getLocalFileList();

    for (const file of files) {
      let content = '';
      if (options.repoFiles) {
        const rf = options.repoFiles.find((f) => f.path === file);
        content = rf?.content || '';
      } else {
        try {
          content = fs.readFileSync(file, 'utf8');
        } catch (_) {
          continue;
        }
      }

      if (!refRegex.test(content)) continue;

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (refRegex.test(lines[i])) {
          results.push({
            file,
            line: i + 1,
            match: lines[i].trim(),
            snippet: lines[i].trim()
          });
          if (results.length >= max) return results;
        }
      }
    }

    return results;
  }

  /**
   * Import & Dependency Tracing
   */
  public traceDependencies(filePath: string, options: CodebaseSearchOptions = {}): DependencyTrace {
    const normPath = filePath.replace(/\\/g, '/');
    let content = '';

    if (options.repoFiles) {
      const rf = options.repoFiles.find((f) => f.path === normPath);
      content = rf?.content || '';
    } else {
      try {
        content = fs.readFileSync(normPath, 'utf8');
      } catch (_) {}
    }

    const imports: string[] = [];
    const exports: string[] = [];
    const importRegex = /(?:import\s+.*?from\s+['"](.*?)['"]|require\(['"](.*?)['"]\))/g;
    const exportRegex = /export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|type|interface)\s+([A-Za-z0-9_$]+)/g;

    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1] || match[2]);
    }

    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    // Find which files import this file
    const importedBy: string[] = [];
    const baseName = path.basename(normPath, path.extname(normPath));
    const allFiles = options.repoFiles ? options.repoFiles.map((f) => f.path) : this.getLocalFileList();

    for (const otherFile of allFiles) {
      if (otherFile === normPath) continue;
      let otherContent = '';
      if (options.repoFiles) {
        otherContent = options.repoFiles.find((f) => f.path === otherFile)?.content || '';
      } else {
        try {
          otherContent = fs.readFileSync(otherFile, 'utf8');
        } catch (_) {}
      }

      if (otherContent.includes(baseName) || otherContent.includes(normPath)) {
        importedBy.push(otherFile);
      }
    }

    return {
      file: normPath,
      imports,
      importedBy: importedBy.slice(0, 15),
      exports
    };
  }

  /**
   * Natural Language Architectural Query Answering
   * Answers queries like:
   * "Where is authentication handled?"
   * "What files control the chat UI?"
   * "Where is this function used?"
   * "What calls this API?"
   */
  public queryArchitecture(
    question: string,
    options: CodebaseSearchOptions = {}
  ): {
    question: string;
    relevantFiles: string[];
    summary: string;
    snippets: SearchMatch[];
  } {
    const qLower = question.toLowerCase();

    // Map common domain questions to architectural areas
    let keywords: string[] = [];
    if (qLower.includes('auth') || qLower.includes('login') || qLower.includes('sign in') || qLower.includes('user')) {
      keywords = ['auth', 'login', 'user', 'session', 'token', 'jwt', 'security'];
    } else if (qLower.includes('chat') || qLower.includes('message') || qLower.includes('conversation')) {
      keywords = ['chat', 'message', 'conversation', 'inputarea', 'messagebubble', 'chatscreen'];
    } else if (qLower.includes('api') || qLower.includes('route') || qLower.includes('endpoint') || qLower.includes('backend')) {
      keywords = ['/api/', 'createapp', 'express', 'router', 'client.ts'];
    } else if (qLower.includes('github') || qLower.includes('repo')) {
      keywords = ['github', 'repo', 'branch', 'commit', 'coding'];
    } else if (qLower.includes('setting') || qLower.includes('preference') || qLower.includes('config')) {
      keywords = ['settings', 'config', 'preferences', 'modal'];
    } else {
      // Extract main words > 3 letters
      keywords = question
        .replace(/[^a-zA-Z0-9_\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .map((w) => w.toLowerCase());
    }

    const files = options.repoFiles ? options.repoFiles.map((f) => f.path) : this.getLocalFileList();

    // Score files by keyword relevance
    const scoredFiles: { file: string; score: number }[] = [];
    for (const f of files) {
      let score = 0;
      const fLower = f.toLowerCase();
      for (const kw of keywords) {
        if (fLower.includes(kw)) score += 5;
      }
      if (score > 0) {
        scoredFiles.push({ file: f, score });
      }
    }

    scoredFiles.sort((a, b) => b.score - a.score);
    const topFiles = scoredFiles.slice(0, 8).map((sf) => sf.file);

    // Get matching code snippets for top files
    const snippets: SearchMatch[] = [];
    for (const f of topFiles.slice(0, 4)) {
      const match = this.fullTextSearch(keywords[0] || 'export', {
        ...options,
        repoFiles: options.repoFiles?.filter((rf) => rf.path === f),
        maxResults: 2
      });
      snippets.push(...match);
    }

    const summary = topFiles.length > 0
      ? `Found ${topFiles.length} relevant files matching the query: ${topFiles.join(', ')}.`
      : 'No directly matching files found in the current codebase indexing.';

    return {
      question,
      relevantFiles: topFiles,
      summary,
      snippets: snippets.slice(0, 6)
    };
  }
}

export const codebaseSearch = new CodebaseSearchService();
