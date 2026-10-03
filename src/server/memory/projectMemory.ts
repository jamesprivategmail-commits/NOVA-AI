import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { ProjectMemory } from '../agent/types';
import fs from 'fs';
import path from 'path';

// Memory collection name in Firestore
const PROJECT_MEMORY_COLLECTION = 'project_memories';

export class ProjectMemoryService {
  /**
   * Normalize projectId into a safe Firestore document ID
   */
  public sanitizeProjectId(projectId: string): string {
    return projectId.trim().replace(/[\/\\]/g, '__') || 'workspace-default';
  }

  /**
   * Retrieve persistent project memory from Firestore
   */
  public async getProjectMemory(projectId: string): Promise<ProjectMemory | null> {
    const docId = this.sanitizeProjectId(projectId);
    try {
      const docRef = doc(db, PROJECT_MEMORY_COLLECTION, docId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        return snap.data() as ProjectMemory;
      }
    } catch (err) {
      console.warn(`[Project Memory] Could not read memory for ${docId}:`, err);
    }

    // If no stored memory exists yet, attempt baseline discovery
    return this.discoverBaselineMemory(projectId);
  }

  /**
   * Save or update project memory in Firestore
   */
  public async saveProjectMemory(
    projectId: string,
    updates: Partial<ProjectMemory>
  ): Promise<ProjectMemory> {
    const docId = this.sanitizeProjectId(projectId);
    const existing = (await this.getProjectMemory(projectId)) || {
      projectId,
      updatedAt: Date.now()
    };

    const updatedMemory: ProjectMemory = {
      ...existing,
      ...updates,
      projectId,
      updatedAt: Date.now()
    };

    try {
      const docRef = doc(db, PROJECT_MEMORY_COLLECTION, docId);
      await setDoc(docRef, updatedMemory, { merge: true });
    } catch (err) {
      console.warn(`[Project Memory] Failed to save memory for ${docId}:`, err);
    }

    return updatedMemory;
  }

  /**
   * Clear project memory
   */
  public async clearProjectMemory(projectId: string): Promise<boolean> {
    const docId = this.sanitizeProjectId(projectId);
    try {
      const docRef = doc(db, PROJECT_MEMORY_COLLECTION, docId);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.warn(`[Project Memory] Failed to delete memory for ${docId}:`, err);
      return false;
    }
  }

  /**
   * Automatically discover baseline memory from workspace files (package.json, tsconfig.json, directory structure)
   */
  public discoverBaselineMemory(projectId: string): ProjectMemory {
    let framework = 'React 19 + Express (Fullstack)';
    let language = 'TypeScript';
    let packageManager = 'npm';
    const entryPoints: string[] = ['server.ts', 'src/main.tsx', 'index.html'];
    const importantDirectories: string[] = ['src/frontend', 'src/server', 'src/config'];
    let authArchitecture = 'Firebase Auth client SDK';
    let databaseStructure = 'Firebase Firestore client SDK';
    let apiStructure = 'Express backend mounted on /api/* routes';
    let deploymentConfig = 'Single-origin fullstack app on port 3000';
    let codingConventions = 'TypeScript, Tailwind CSS v4, functional React hooks, modular components';

    try {
      const pkgPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.dependencies?.['next']) {
          framework = 'Next.js';
        } else if (pkg.dependencies?.['vite'] || pkg.devDependencies?.['vite']) {
          framework = 'React + Vite + Express';
        }
      }
    } catch (_) {}

    return {
      projectId,
      framework,
      language,
      packageManager,
      entryPoints,
      importantDirectories,
      authArchitecture,
      databaseStructure,
      apiStructure,
      deploymentConfig,
      codingConventions,
      previousDecisions: [
        'Single-origin fullstack app architecture running on port 3000',
        'Direct Firebase client SDK used for persistence without admin credentials'
      ],
      knownIssues: [
        'Terminal command execution is not yet locally available in this environment'
      ],
      userApprovedInstructions: '',
      updatedAt: Date.now()
    };
  }

  /**
   * Format project memory into concise structured context for the AI agent
   */
  public formatMemoryForPrompt(memory: ProjectMemory | null): string {
    if (!memory) return '';

    const lines: string[] = [
      `[PROJECT MEMORY — PERSISTENT CONTEXT FOR ${memory.projectId}]:`,
      `- Framework: ${memory.framework || 'React/Vite/Express'}`,
      `- Language: ${memory.language || 'TypeScript'}`,
      `- Package Manager: ${memory.packageManager || 'npm'}`,
      `- Entry Points: ${(memory.entryPoints || []).join(', ') || 'server.ts, src/main.tsx'}`,
      `- Key Directories: ${(memory.importantDirectories || []).join(', ') || 'src/frontend, src/server'}`,
      `- Auth Architecture: ${memory.authArchitecture || 'Firebase Auth'}`,
      `- Database: ${memory.databaseStructure || 'Firestore'}`,
      `- API Structure: ${memory.apiStructure || 'Express /api/*'}`,
      `- Conventions: ${memory.codingConventions || 'Tailwind CSS, functional components'}`
    ];

    if (memory.previousDecisions && memory.previousDecisions.length > 0) {
      lines.push(`- Previous Architectural Decisions: ${memory.previousDecisions.join('; ')}`);
    }

    if (memory.knownIssues && memory.knownIssues.length > 0) {
      lines.push(`- Known Project Constraints/Issues: ${memory.knownIssues.join('; ')}`);
    }

    if (memory.userApprovedInstructions && memory.userApprovedInstructions.trim()) {
      lines.push(`- User-Approved Instructions: ${memory.userApprovedInstructions.trim()}`);
    }

    return lines.join('\n');
  }
}

export const projectMemoryService = new ProjectMemoryService();
