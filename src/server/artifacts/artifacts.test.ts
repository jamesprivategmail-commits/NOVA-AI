import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';

const tmpWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-artifacts-test-'));
process.env.WORKSPACE_ROOT = tmpWorkspace;

import { parseArtifactsFromResponse, sanitizeArtifactPath } from '../../utils/artifactParser';
import {
  generatePdfBuffer,
  extractTextFromPdfBuffer,
  generateXlsxBuffer,
  parseXlsxBuffer,
  generateDocxBuffer,
  parseDocxBuffer,
  parseCsvRows,
} from './formatHandlers';
import { terminate } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { ArtifactService } from './artifactService';

test.after(async () => {
  await terminate(db).catch(() => {});
  fs.rmSync(tmpWorkspace, { recursive: true, force: true });
});

test('parseArtifactsFromResponse extracts structured nova-artifact files and replaces inline dumps', () => {
  const response = [
    'Here is your interactive dashboard:',
    '',
    '```nova-artifact {"path":"index.html","title":"Analytics Dashboard","project":"dash-app"}',
    '<!DOCTYPE html><html><head><title>Dash</title><link rel="stylesheet" href="styles.css"></head><body><h1 id="title">Dashboard</h1></body></html>',
    '```',
    '',
    '```nova-artifact {"path":"styles.css","project":"dash-app"}',
    'body { background: #111; color: #eee; font-family: sans-serif; }',
    '```',
    '',
    'Enjoy!',
  ].join('\n');

  const parsed = parseArtifactsFromResponse(response, false);
  assert.equal(parsed.files.length, 2);
  assert.equal(parsed.projectName, 'dash-app');
  assert.equal(parsed.files[0].filename, 'index.html');
  assert.equal(parsed.files[0].kind, 'html');
  assert.equal(parsed.files[1].filename, 'styles.css');
  assert.equal(parsed.files[1].kind, 'css');
  assert.ok(parsed.cleanedMarkdown.includes('<!--NOVA_ARTIFACT:0-->'));
  assert.ok(parsed.cleanedMarkdown.includes('<!--NOVA_ARTIFACT:1-->'));
  assert.ok(!parsed.cleanedMarkdown.includes('<!DOCTYPE html>'));
  assert.ok(!parsed.cleanedMarkdown.includes('body { background: #111'));
});

test('parseArtifactsFromResponse detects in-progress streaming artifact fence', () => {
  const partial = 'Starting build:\n\n```nova-artifact {"path":"App.jsx"}\nexport default function App() {\n  return <div>Hello';
  const parsed = parseArtifactsFromResponse(partial, true);
  assert.equal(parsed.hasInProgressArtifact, true);
});

test('parseArtifactsFromResponse supports lang:filename and file attribute fences', () => {
  const md = [
    '```pdf:summary.pdf',
    'Executive Summary',
    '```',
    '',
    '```xlsx file="budget.xlsx"',
    'Item,Cost',
    'Cloud,100',
    '```',
  ].join('\n');
  const parsed = parseArtifactsFromResponse(md, false);
  assert.equal(parsed.files.length, 2);
  assert.equal(parsed.files[0].filename, 'summary.pdf');
  assert.equal(parsed.files[0].extension, 'pdf');
  assert.equal(parsed.files[1].filename, 'budget.xlsx');
  assert.equal(parsed.files[1].extension, 'xlsx');
});

test('formatHandlers generates & parses valid PDF, XLSX, DOCX, and CSV files', async () => {
  const csv = 'Name,Department,"Salary, USD"\nAlice,"Engineering",140000\nBob,"Design, UX",125000\n';
  const csvRows = parseCsvRows(csv);
  assert.equal(csvRows.length, 3);
  assert.equal(csvRows[2][1], 'Design, UX');

  // PDF generation & text extraction
  const pdfBuf = generatePdfBuffer('NOVA AI Architecture Overview\nSection 1: Artifact Storage', 'Architecture');
  assert.ok(pdfBuf.toString('latin1').startsWith('%PDF-1.4'));
  assert.ok(pdfBuf.toString('latin1').includes('%%EOF'));
  const extractedPdf = extractTextFromPdfBuffer(pdfBuf);
  assert.ok(extractedPdf.includes('NOVA AI Architecture Overview'));
  assert.ok(extractedPdf.includes('Artifact Storage'));

  // XLSX OOXML generation & round-trip parse
  const xlsxBuf = await generateXlsxBuffer(csv, 'Employees');
  assert.ok(xlsxBuf.length > 200);
  const parsedXlsx = await parseXlsxBuffer(xlsxBuf);
  assert.equal(parsedXlsx.sheets.length, 1);
  assert.equal(parsedXlsx.sheets[0].rows[1][0], 'Alice');
  assert.equal(parsedXlsx.sheets[0].rows[1][2], '140000');

  // DOCX OOXML generation & round-trip parse
  const docxBuf = await generateDocxBuffer('# Project Spec\nAll modules verified cleanly.');
  assert.ok(docxBuf.length > 200);
  const parsedDocx = await parseDocxBuffer(docxBuf);
  assert.ok(parsedDocx.paragraphs.includes('Project Spec'));
  assert.ok(parsedDocx.paragraphs.includes('All modules verified cleanly.'));
});

test('ArtifactService blocks path traversal (Zip-Slip) and supports CRUD across supported formats', async () => {
  const svc = new ArtifactService();
  assert.equal(sanitizeArtifactPath('../../etc/passwd'), 'etc/passwd');

  assert.throws(() => {
    svc.resolveSafeChildPath(tmpWorkspace, '../outside.txt');
  }, /Security Violation/);
  assert.throws(() => {
    svc.resolveSafeChildPath(tmpWorkspace, 'nested/../../outside.txt');
  }, /Security Violation/);
  assert.throws(() => {
    svc.resolveSafeChildPath(tmpWorkspace, '/etc/passwd');
  }, /Security Violation/);

  // Empty ZIP buffer must reject
  await assert.rejects(
    svc.extractZipProject({
      userId: 'test-user',
      conversationId: 'conv-sec',
      filename: 'empty.zip',
      zipBuffer: Buffer.alloc(0),
    }),
    /empty/i
  );

  // Unsupported executable extension must reject
  assert.throws(() => {
    svc.validateExtension('payload.exe');
  }, /Unsupported file extension/);

  // Corrupt ZIP buffer must reject cleanly
  await assert.rejects(
    svc.extractZipProject({
      userId: 'test-user',
      conversationId: 'conv-sec',
      filename: 'corrupt.zip',
      zipBuffer: Buffer.from('NOT_A_REAL_ZIP_ARCHIVE'),
    })
  );

  // Create, read, update, list, delete artifact
  const htmlArt = await svc.createArtifact({
    userId: 'test-user',
    conversationId: 'conv-crud',
    filename: 'widget.html',
    content: '<div>Initial Widget</div>',
  });
  assert.equal(htmlArt.filename, 'widget.html');
  assert.equal(htmlArt.extension, 'html');
  assert.equal(htmlArt.conversationId, 'conv-crud');

  const fetched = await svc.getArtifact(htmlArt.id, 'test-user');
  assert.ok(fetched);
  assert.equal(fetched.content, '<div>Initial Widget</div>');

  const updated = await svc.updateArtifactContent(htmlArt.id, 'test-user', '<div>Updated Widget</div>');
  assert.ok(updated);
  assert.equal(updated.content, '<div>Updated Widget</div>');

  const list = await svc.listArtifacts({ userId: 'test-user', conversationId: 'conv-crud' });
  assert.ok(list.some((a) => a.id === htmlArt.id));

  const deleted = await svc.deleteArtifact(htmlArt.id, 'test-user');
  assert.equal(deleted, true);
  const afterDelete = await svc.getArtifact(htmlArt.id, 'test-user');
  assert.equal(afterDelete, null);
});

test('ArtifactService extracts ZIP, merges edits while preserving unrelated files, and outputs valid non-empty ZIP', async () => {
  const svc = new ArtifactService();

  const sourceZip = new JSZip();
  sourceZip.file('index.html', '<html><body><h1>Old Header</h1><script src="app.js"></script></body></html>');
  sourceZip.file('styles.css', 'body { color: navy; }');
  sourceZip.file('app.js', 'console.log("unchanged-app");');
  sourceZip.file('assets/readme.txt', 'UNRELATED_ASSET_MUST_STAY_INTACT');
  const sourceZipBuf = await sourceZip.generateAsync({ type: 'nodebuffer' });

  const extracted = await svc.extractZipProject({
    userId: 'zip-user',
    conversationId: 'conv-zip-1',
    filename: 'starter-site.zip',
    zipBuffer: sourceZipBuf,
  });

  assert.equal(extracted.fileTree.length, 4);
  assert.equal(extracted.hasHtmlEntry, true);

  // Simulate AI editing ONLY index.html & adding config.json
  const aiResponse = [
    'Updated the header cleanly:',
    '',
    '```nova-artifact {"path":"index.html","project":"starter-site-v2"}',
    '<html><body><h1>New NOVA Header</h1><link rel="stylesheet" href="styles.css"><script src="app.js"></script></body></html>',
    '```',
    '',
    '```nova-artifact {"path":"config.json","project":"starter-site-v2"}',
    '{"version":2}',
    '```',
  ].join('\n');

  const committed = await svc.commitResponseArtifacts({
    userId: 'zip-user',
    conversationId: 'conv-zip-1',
    messageId: 'msg-1',
    rawText: aiResponse,
    sourceProjectId: extracted.projectId,
  });

  assert.equal(committed.artifacts.length, 2);
  assert.ok(committed.zipArtifact, 'Expected rebuilt ZIP artifact');
  assert.equal(committed.zipArtifact.extension, 'zip');
  assert.ok(committed.zipArtifact.size > 50, 'ZIP archive must be non-empty');

  const zipLoaded = await svc.getArtifactWithBuffer(committed.zipArtifact.id, 'zip-user');
  assert.ok(zipLoaded);

  const rebuiltZip = await JSZip.loadAsync(zipLoaded.buffer);
  const filesMap = rebuiltZip.files;

  assert.ok(filesMap['index.html']);
  assert.ok(filesMap['config.json']);
  assert.ok(filesMap['styles.css'], 'Unmodified styles.css must be preserved');
  assert.ok(filesMap['app.js'], 'Unmodified app.js must be preserved');
  assert.ok(filesMap['assets/readme.txt'], 'Unmodified nested asset must be preserved');

  assert.equal(await filesMap['assets/readme.txt'].async('string'), 'UNRELATED_ASSET_MUST_STAY_INTACT');
  assert.equal(await filesMap['styles.css'].async('string'), 'body { color: navy; }');
  assert.ok((await filesMap['index.html'].async('string')).includes('New NOVA Header'));
});

test('ArtifactService compiles React JSX offline and injects sibling CSS into HTML previews', async () => {
  const svc = new ArtifactService();

  const jsxCode = `
    import React, { useState } from 'react';
    export default function CounterCard() {
      const [count, setCount] = useState(0);
      return <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>;
    }
  `;

  const compiledReactHtml = await svc.compilePreviewHtml({
    inlineContent: jsxCode,
    inlineFilename: 'CounterCard.jsx',
  });

  assert.ok(compiledReactHtml.toLowerCase().includes('<!doctype html>'));
  assert.ok(compiledReactHtml.includes('CounterCard') || compiledReactHtml.includes('createRoot'));
  assert.ok(!compiledReactHtml.includes('React Preview Compile Error'));

  // Sibling CSS + JS injection into HTML
  const cssArt = await svc.createArtifact({
    userId: 'preview-user',
    conversationId: 'conv-prev',
    filename: 'theme.css',
    path: 'theme.css',
    content: 'h1 { color: crimson; }',
  });
  const htmlArt = await svc.createArtifact({
    userId: 'preview-user',
    conversationId: 'conv-prev',
    filename: 'index.html',
    path: 'index.html',
    content: '<!DOCTYPE html><html><head><link rel="stylesheet" href="theme.css"></head><body><h1>Hi</h1></body></html>',
  });

  const compiledSite = await svc.compilePreviewHtml({
    artifact: htmlArt,
    siblings: [cssArt, htmlArt],
  });
  assert.ok(compiledSite.includes('h1 { color: crimson; }'));
});
