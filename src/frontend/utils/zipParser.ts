import JSZip from 'jszip';

export interface ExtractedZipFile {
  path: string;
  name: string;
  size: number;
  isText: boolean;
  content?: string;
}

export interface ParsedZipResult {
  fileName: string;
  totalFiles: number;
  totalSize: number;
  fileTree: string[];
  extractedFiles: ExtractedZipFile[];
  aiPromptSnippet: string;
  hasHtmlEntry: boolean;
  htmlEntryContent?: string;
  htmlEntryPath?: string;
}

const TEXT_FILE_EXTENSIONS = new Set([
  'html', 'htm', 'xhtml',
  'css', 'scss', 'sass', 'less',
  'js', 'jsx', 'mjs', 'cjs',
  'ts', 'tsx', 'mts', 'cts',
  'json', 'json5', 'yaml', 'yml', 'toml', 'xml',
  'md', 'markdown', 'txt', 'rtf', 'csv', 'tsv',
  'py', 'pyw', 'rb', 'php', 'java', 'c', 'cpp', 'h', 'hpp',
  'cs', 'go', 'rs', 'swift', 'kt', 'kts', 'sh', 'bash', 'zsh',
  'sql', 'graphql', 'gql', 'dockerfile', 'env', 'gitignore',
  'svg'
]);

const IGNORED_PREFIXES = [
  'node_modules/',
  '.git/',
  '.next/',
  '.nuxt/',
  'dist/',
  'build/',
  '__pycache__/',
  '.vscode/',
  '.idea/',
  '.DS_Store'
];

/**
 * Checks if a file path is likely a human-readable text/code file
 */
export function isTextFile(filePath: string): boolean {
  const normalized = filePath.toLowerCase();
  const parts = normalized.split('.');
  const ext = parts.length > 1 ? parts.pop()! : '';
  const baseName = normalized.split('/').pop() || '';

  if (baseName === 'dockerfile' || baseName.startsWith('.env') || baseName === 'makefile' || baseName === 'license') {
    return true;
  }

  return TEXT_FILE_EXTENSIONS.has(ext);
}

/**
 * Unpacks and parses a ZIP archive buffer or File object into an AI-ready context snapshot
 */
export async function parseZipArchive(file: File): Promise<ParsedZipResult> {
  const zip = new JSZip();
  const arrayBuffer = await file.arrayBuffer();
  const loadedZip = await zip.loadAsync(arrayBuffer);

  const extractedFiles: ExtractedZipFile[] = [];
  const fileTree: string[] = [];
  let totalSize = 0;
  let hasHtmlEntry = false;
  let htmlEntryContent: string | undefined;
  let htmlEntryPath: string | undefined;

  const entries: { path: string; entry: JSZip.JSZipObject }[] = [];
  loadedZip.forEach((relativePath, entry) => {
    // Skip directories and ignored folders (node_modules, .git, etc.)
    if (entry.dir) return;
    if (IGNORED_PREFIXES.some(prefix => relativePath.includes(prefix))) return;
    if (relativePath.split('/').pop()?.startsWith('._')) return; // AppleDouble resource fork

    entries.push({ path: relativePath, entry });
  });

  // Sort alphabetically by path
  entries.sort((a, b) => a.path.localeCompare(b.path));

  // Extract up to 60 text files to prevent context overload, prioritizing root and src
  const MAX_TEXT_FILES = 60;
  const MAX_PER_FILE_CHARS = 12000;
  let textFilesRead = 0;

  for (const { path: filePath, entry } of entries) {
    fileTree.push(filePath);
    const size = (entry as any)._data?.uncompressedSize || 0;
    totalSize += size;

    const isText = isTextFile(filePath);

    if (isText && textFilesRead < MAX_TEXT_FILES) {
      try {
        const rawContent = await entry.async('string');
        const truncatedContent = rawContent.slice(0, MAX_PER_FILE_CHARS);
        
        extractedFiles.push({
          path: filePath,
          name: filePath.split('/').pop() || filePath,
          size: rawContent.length,
          isText: true,
          content: truncatedContent
        });

        textFilesRead++;

        // Detect primary HTML entry point (e.g. index.html or first html)
        if (filePath.toLowerCase().endsWith('.html')) {
          if (!hasHtmlEntry || filePath.toLowerCase().endsWith('index.html')) {
            hasHtmlEntry = true;
            htmlEntryContent = rawContent;
            htmlEntryPath = filePath;
          }
        }
      } catch (_) {
        extractedFiles.push({
          path: filePath,
          name: filePath.split('/').pop() || filePath,
          size,
          isText: false
        });
      }
    } else {
      extractedFiles.push({
        path: filePath,
        name: filePath.split('/').pop() || filePath,
        size,
        isText
      });
    }
  }

  // Build markdown representation for the AI brain
  let aiPromptSnippet = `📦 **ZIP Archive Snapshot: \`${file.name}\`**\n`;
  aiPromptSnippet += `- **Total Files:** ${entries.length} entries\n`;
  aiPromptSnippet += `- **Uncompressed Size:** ${(totalSize / 1024).toFixed(1)} KB\n\n`;
  aiPromptSnippet += `### Directory Tree:\n\`\`\`\n${fileTree.slice(0, 45).join('\n')}${fileTree.length > 45 ? `\n... and ${fileTree.length - 45} more files` : ''}\n\`\`\`\n\n`;

  aiPromptSnippet += `### Key Extracted File Contents:\n`;
  for (const f of extractedFiles.filter(f => f.content)) {
    const ext = f.path.split('.').pop() || '';
    aiPromptSnippet += `\n**File: \`${f.path}\`** (${f.size} bytes)\n\`\`\`${ext}\n${f.content}\n\`\`\`\n`;
  }

  return {
    fileName: file.name,
    totalFiles: entries.length,
    totalSize,
    fileTree,
    extractedFiles,
    aiPromptSnippet,
    hasHtmlEntry,
    htmlEntryContent,
    htmlEntryPath
  };
}
