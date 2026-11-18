import express from 'express';
import { artifactService, MAX_SINGLE_FILE_BYTES, MAX_ZIP_BYTES } from './artifactService';

export function createArtifactRouter() {
  const router = express.Router();
  router.use(express.json({ limit: '45mb' }));

  // Upload a single file (text, code, image, PDF, XLSX, DOCX, SVG, etc.)
  router.post('/upload', async (req, res) => {
    try {
      const {
        userId = 'workspace-default',
        conversationId = 'default-chat',
        filename,
        path: filePath,
        content,
        base64Data,
        mimeType,
        title,
      } = req.body || {};

      if (!filename || typeof filename !== 'string') {
        return res.status(400).json({ error: 'filename is required' });
      }

      if (base64Data && typeof base64Data === 'string') {
        const approxBytes = Math.ceil((base64Data.length * 3) / 4);
        if (approxBytes > MAX_SINGLE_FILE_BYTES) {
          return res.status(413).json({ error: 'File exceeds 25 MB upload limit' });
        }
      }

      const artifact = await artifactService.createArtifact({
        userId,
        conversationId,
        filename,
        path: filePath || filename,
        content: typeof content === 'string' ? content : undefined,
        base64Data: typeof base64Data === 'string' ? base64Data : undefined,
        mimeType,
        title: title || filename,
      });

      res.json({ success: true, artifact });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to upload artifact' });
    }
  });

  // Upload and safely extract a ZIP archive into a persistent project directory
  router.post('/upload-zip', async (req, res) => {
    try {
      const {
        userId = 'workspace-default',
        conversationId = 'default-chat',
        filename = 'project.zip',
        base64Data,
      } = req.body || {};

      if (!base64Data || typeof base64Data !== 'string') {
        return res.status(400).json({ error: 'base64Data is required for ZIP upload' });
      }

      const stripped = base64Data.replace(/^data:[^;]+;base64,/, '');
      const zipBuffer = Buffer.from(stripped, 'base64');
      if (zipBuffer.length > MAX_ZIP_BYTES) {
        return res.status(413).json({ error: 'ZIP exceeds 50 MB upload limit' });
      }

      const result = await artifactService.extractZipProject({
        userId,
        conversationId,
        filename,
        zipBuffer,
      });

      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to extract ZIP archive' });
    }
  });

  // Commit generated artifacts from Shii's response (and rebuild ZIP project if applicable)
  router.post('/commit-response', async (req, res) => {
    try {
      const {
        userId = 'workspace-default',
        conversationId = 'default-chat',
        messageId,
        rawText = '',
        sourceProjectId,
        projectName,
        files,
      } = req.body || {};

      const committed = await artifactService.commitResponseArtifacts({
        userId,
        conversationId,
        messageId,
        rawText,
        sourceProjectId,
        projectName,
        files,
      });

      res.json({ success: true, ...committed });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to commit response artifacts' });
    }
  });

  // Rebind uploaded pending-chat artifacts once conversationId is created
  router.post('/rebind', async (req, res) => {
    try {
      const { userId = 'workspace-default', artifactIds = [], conversationId } = req.body || {};
      if (!conversationId || !Array.isArray(artifactIds) || artifactIds.length === 0) {
        return res.json({ success: true, artifacts: [] });
      }
      const artifacts = await artifactService.rebindArtifactsToConversation(userId, artifactIds, conversationId);
      res.json({ success: true, artifacts });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to rebind artifacts' });
    }
  });

  // Create or save a single artifact directly
  router.post('/', async (req, res) => {
    try {
      const {
        userId = 'workspace-default',
        conversationId = 'default-chat',
        messageId,
        filename,
        path: filePath,
        content,
        base64Data,
        mimeType,
        title,
        description,
        groupId,
        projectName,
      } = req.body || {};

      if (!filename) {
        return res.status(400).json({ error: 'filename is required' });
      }

      const artifact = await artifactService.createArtifact({
        userId,
        conversationId,
        messageId,
        filename,
        path: filePath || filename,
        content,
        base64Data,
        mimeType,
        title,
        description,
        groupId,
        projectName,
      });

      res.json({ success: true, artifact });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to create artifact' });
    }
  });

  // Bundle selected artifact IDs into a downloadable ZIP
  router.post('/group-zip', async (req, res) => {
    try {
      const {
        userId = 'workspace-default',
        conversationId = 'default-chat',
        artifactIds = [],
        projectName = 'nova-project',
      } = req.body || {};

      if (!Array.isArray(artifactIds) || artifactIds.length === 0) {
        return res.status(400).json({ error: 'artifactIds array is required' });
      }

      const zipArtifact = await artifactService.buildZipFromArtifacts({
        userId,
        conversationId,
        artifactIds,
        projectName,
      });

      res.json({ success: true, zipArtifact });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to generate ZIP bundle' });
    }
  });

  // Compile inline HTML/JSX/CSS/CSV/Markdown preview without requiring prior save
  router.post('/preview-inline', async (req, res) => {
    try {
      const { content = '', filename = 'preview.html', siblings = [] } = req.body || {};
      const html = await artifactService.compilePreviewHtml({
        inlineContent: content,
        inlineFilename: filename,
        siblings,
      });
      res.json({ success: true, html });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to compile preview' });
    }
  });

  // List artifacts for a user and/or conversation
  router.get('/', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || undefined;
      const conversationId = (req.query.conversationId as string) || undefined;
      const artifacts = await artifactService.listArtifacts({ userId, conversationId });
      res.json({ success: true, artifacts });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to list artifacts' });
    }
  });

  // Update artifact content
  router.patch('/:id', async (req, res) => {
    try {
      const { userId = 'workspace-default', content } = req.body || {};
      if (typeof content !== 'string') {
        return res.status(400).json({ error: 'content string is required' });
      }
      const updated = await artifactService.updateArtifactContent(req.params.id, userId, content);
      if (!updated) return res.status(404).json({ error: 'Artifact not found or access denied' });
      res.json({ success: true, artifact: updated });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to update artifact' });
    }
  });

  // Inspect ZIP archive artifact contents
  router.get('/:id/zip-inspect', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || undefined;
      const zipData = await artifactService.extractZipEntriesForInspector(req.params.id, userId);
      if (!zipData) return res.status(404).json({ error: 'ZIP artifact not found' });
      res.json({ success: true, zipData });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to inspect ZIP artifact' });
    }
  });

  // Compile and return sandboxed HTML preview for an artifact
  router.get('/:id/preview-html', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || undefined;
      const loaded = await artifactService.getArtifactWithBuffer(req.params.id, userId);
      if (!loaded) return res.status(404).send('Artifact not found');

      const all = await artifactService.listArtifacts({
        userId: loaded.record.userId,
        conversationId: loaded.record.conversationId,
      });
      const rawContent = loaded.record.content || '';
      const siblings = loaded.record.groupId
        ? all.filter((a) => a.groupId === loaded.record.groupId)
        : loaded.record.messageId
          ? all.filter((a) => a.messageId === loaded.record.messageId)
          : all.filter((a) => a.id !== loaded.record.id && rawContent.includes(a.filename));

      const html = await artifactService.compilePreviewHtml({
        artifact: loaded.record,
        buffer: loaded.buffer,
        siblings,
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob: https:; font-src data:;");
      res.send(html);
    } catch (err: any) {
      res.status(500).send(`Preview error: ${err?.message || 'Unknown error'}`);
    }
  });

  // Serve raw file inline (images, PDF, SVG, text)
  router.get('/:id/raw', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || undefined;
      const loaded = await artifactService.getArtifactWithBuffer(req.params.id, userId);
      if (!loaded) return res.status(404).json({ error: 'Artifact not found' });

      res.setHeader('Content-Type', loaded.record.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${loaded.record.filename.replace(/"/g, '')}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Length', String(loaded.buffer.length));
      res.send(loaded.buffer);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to serve artifact' });
    }
  });

  // Download file as attachment with exact filename & extension
  router.get('/:id/download', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || undefined;
      const loaded = await artifactService.getArtifactWithBuffer(req.params.id, userId);
      if (!loaded) return res.status(404).json({ error: 'Artifact not found' });

      res.setHeader('Content-Type', loaded.record.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${loaded.record.filename.replace(/"/g, '')}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Length', String(loaded.buffer.length));
      res.send(loaded.buffer);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to download artifact' });
    }
  });

  // Get single artifact metadata + content
  router.get('/:id', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || undefined;
      const artifact = await artifactService.getArtifact(req.params.id, userId);
      if (!artifact) return res.status(404).json({ error: 'Artifact not found' });
      res.json({ success: true, artifact });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to get artifact' });
    }
  });

  // Delete artifact
  router.delete('/:id', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || (req.body?.userId as string) || undefined;
      const deleted = await artifactService.deleteArtifact(req.params.id, userId);
      res.json({ success: deleted });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to delete artifact' });
    }
  });

  return router;
}
