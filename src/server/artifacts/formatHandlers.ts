import zlib from 'zlib';
import JSZip from 'jszip';

export function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Parses CSV or TSV text into a 2D array of strings (RFC-4180 compliant quotes).
 */
export function parseCsvRows(csvText: string, delimiter: string = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        row.push(cell);
        cell = '';
      } else if (ch === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function columnIndexToLetters(colIdx: number): string {
  let letters = '';
  let n = colIdx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function columnLettersToIndex(letters: string): number {
  let idx = 0;
  for (let i = 0; i < letters.length; i++) {
    idx = idx * 26 + (letters.charCodeAt(i) - 64);
  }
  return idx - 1;
}

/**
 * Generates a real, valid OOXML .xlsx spreadsheet archive from CSV, JSON array, or raw text rows.
 */
export async function generateXlsxBuffer(sourceText: string, sheetName: string = 'Sheet1'): Promise<Buffer> {
  let rows: string[][] = [];
  const trimmed = sourceText.trim();

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (Array.isArray(parsed[0])) {
          rows = parsed.map((r) => (Array.isArray(r) ? r.map((v) => String(v ?? '')) : [String(r ?? '')]));
        } else if (typeof parsed[0] === 'object' && parsed[0] !== null) {
          const headers = Array.from(new Set(parsed.flatMap((item) => Object.keys(item || {}))));
          rows.push(headers);
          for (const item of parsed) {
            rows.push(headers.map((h) => String((item as any)?.[h] ?? '')));
          }
        }
      }
    } catch (_) {}
  }

  if (rows.length === 0) {
    rows = parseCsvRows(sourceText, trimmed.includes('\t') && !trimmed.includes(',') ? '\t' : ',');
  }

  if (rows.length === 0) {
    rows = [['Data'], [sourceText || 'Empty']];
  }

  const sharedStrings: string[] = [];
  const sharedStringIndex = new Map<string, number>();

  const getStringIdx = (val: string): number => {
    if (sharedStringIndex.has(val)) return sharedStringIndex.get(val)!;
    const idx = sharedStrings.length;
    sharedStrings.push(val);
    sharedStringIndex.set(val, idx);
    return idx;
  };

  const sheetRowsXml = rows
    .map((r, rIdx) => {
      const rowNum = rIdx + 1;
      const cellsXml = r
        .map((val, cIdx) => {
          const ref = `${columnIndexToLetters(cIdx)}${rowNum}`;
          const numVal = Number(val);
          if (val.trim() !== '' && Number.isFinite(numVal) && !/^0\d+/.test(val.trim())) {
            return `<c r="${ref}"><v>${numVal}</v></c>`;
          }
          const sIdx = getStringIdx(val);
          return `<c r="${ref}" t="s"><v>${sIdx}</v></c>`;
        })
        .join('');
      return `<row r="${rowNum}">${cellsXml}</row>`;
    })
    .join('');

  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">
${sharedStrings.map((s) => `<si><t xml:space="preserve">${escapeXml(s)}</t></si>`).join('')}
</sst>`;

  const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${sheetRowsXml}</sheetData>
</worksheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${escapeXml(sheetName.slice(0, 31) || 'Sheet1')}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', rootRelsXml);
  zip.file('xl/workbook.xml', workbookXml);
  zip.file('xl/_rels/workbook.xml.rels', workbookRelsXml);
  zip.file('xl/sharedStrings.xml', sharedStringsXml);
  zip.file('xl/worksheets/sheet1.xml', worksheetXml);

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/**
 * Parses an OOXML .xlsx Buffer into structured rows and CSV text.
 */
export async function parseXlsxBuffer(buffer: Buffer): Promise<{ sheets: { name: string; rows: string[][] }[]; textSummary: string }> {
  const zip = await JSZip.loadAsync(buffer);
  const sharedStrings: string[] = [];

  const ssEntry = zip.file('xl/sharedStrings.xml');
  if (ssEntry) {
    const ssXml = await ssEntry.async('string');
    const siMatches = ssXml.match(/<si[\s\S]*?<\/si>/g) || [];
    for (const si of siMatches) {
      const tMatches = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
      const joined = tMatches
        .map((t) => decodeXmlEntities(t.replace(/<t[^>]*>|<\/t>/g, '')))
        .join('');
      sharedStrings.push(joined);
    }
  }

  const sheetFiles = Object.keys(zip.files)
    .filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(p))
    .sort();

  const sheets: { name: string; rows: string[][] }[] = [];

  for (let i = 0; i < sheetFiles.length; i++) {
    const xml = await zip.file(sheetFiles[i])!.async('string');
    const rows: string[][] = [];
    const rowMatches = xml.match(/<row\b[\s\S]*?<\/row>/g) || [];

    for (const rowXml of rowMatches) {
      const rowValues: string[] = [];
      const cellMatches = rowXml.match(/<c\b[\s\S]*?(?:\/>|<\/c>)/g) || [];
      for (const cellXml of cellMatches) {
        const refMatch = cellXml.match(/\br="([A-Z]+)\d+"/);
        const typeMatch = cellXml.match(/\bt="([^"]+)"/);
        const colIdx = refMatch ? columnLettersToIndex(refMatch[1]) : rowValues.length;
        const cellType = typeMatch ? typeMatch[1] : '';

        let val = '';
        if (cellType === 'inlineStr') {
          const isMatch = cellXml.match(/<t[^>]*>([\s\S]*?)<\/t>/);
          val = isMatch ? decodeXmlEntities(isMatch[1]) : '';
        } else {
          const vMatch = cellXml.match(/<v[^>]*>([\s\S]*?)<\/v>/);
          const rawV = vMatch ? decodeXmlEntities(vMatch[1]) : '';
          if (cellType === 's') {
            val = sharedStrings[Number(rawV)] ?? rawV;
          } else {
            val = rawV;
          }
        }
        while (rowValues.length < colIdx) rowValues.push('');
        rowValues[colIdx] = val;
      }
      rows.push(rowValues);
    }

    sheets.push({ name: `Sheet${i + 1}`, rows });
  }

  const textSummary = sheets
    .map((s) => `### ${s.name}\n${s.rows.slice(0, 120).map((r) => r.join(', ')).join('\n')}`)
    .join('\n\n');

  return { sheets, textSummary };
}

/**
 * Generates a real, valid OOXML .docx Word document archive from Markdown or plain text.
 */
export async function generateDocxBuffer(textContent: string): Promise<Buffer> {
  const lines = textContent.replace(/\r\n/g, '\n').split('\n');
  const paragraphsXml = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return '<w:p/>';
      }
      const isHeading1 = trimmed.startsWith('# ');
      const isHeading2 = trimmed.startsWith('## ') || trimmed.startsWith('### ');
      const cleanLine = trimmed.replace(/^#{1,6}\s+/, '');
      const bold = isHeading1 || isHeading2;
      const sz = isHeading1 ? '32' : isHeading2 ? '26' : '22';
      return `<w:p><w:r><w:rPr>${bold ? '<w:b/>' : ''}<w:sz w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${escapeXml(cleanLine)}</w:t></w:r></w:p>`;
    })
    .join('');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
${paragraphsXml}
<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
</w:body>
</w:document>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', rootRelsXml);
  zip.file('word/_rels/document.xml.rels', docRelsXml);
  zip.file('word/document.xml', documentXml);

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/**
 * Parses an OOXML .docx Buffer into paragraphs and readable text.
 */
export async function parseDocxBuffer(buffer: Buffer): Promise<{ paragraphs: string[]; text: string }> {
  const zip = await JSZip.loadAsync(buffer);
  const docEntry = zip.file('word/document.xml');
  if (!docEntry) {
    return { paragraphs: [], text: '' };
  }
  const xml = await docEntry.async('string');
  const pMatches = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
  const paragraphs: string[] = [];

  for (const pXml of pMatches) {
    const tMatches = pXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
    const line = tMatches
      .map((t) => decodeXmlEntities(t.replace(/<w:t[^>]*>|<\/w:t>/g, '')))
      .join('')
      .trim();
    if (line) paragraphs.push(line);
  }

  return { paragraphs, text: paragraphs.join('\n\n') };
}

function escapePdfString(str: string): string {
  return str
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapTextLines(text: string, maxChars: number = 88): string[] {
  const out: string[] = [];
  for (const rawLine of text.replace(/\r\n/g, '\n').split('\n')) {
    if (rawLine.length <= maxChars) {
      out.push(rawLine);
      continue;
    }
    const words = rawLine.split(/\s+/);
    let current = '';
    for (const w of words) {
      if ((current + ' ' + w).trim().length > maxChars) {
        if (current) out.push(current);
        current = w;
      } else {
        current = current ? `${current} ${w}` : w;
      }
    }
    if (current) out.push(current);
  }
  return out.length > 0 ? out : [' '];
}

/**
 * Generates a real, standards-compliant multi-page %PDF-1.4 document from text.
 */
export function generatePdfBuffer(text: string, title: string = 'NOVA AI Document'): Buffer {
  const lines = wrapTextLines(text, 86);
  const linesPerPage = 46;
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push([' ']);

  const objects: string[] = [];
  // 1: Catalog, 2: Pages, 3: Font
  const fontObjId = 3;
  const pageObjIds: number[] = [];
  const contentObjIds: number[] = [];

  let nextId = 4;
  for (let p = 0; p < pages.length; p++) {
    pageObjIds.push(nextId++);
    contentObjIds.push(nextId++);
  }

  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`);
  objects.push(`3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

  for (let p = 0; p < pages.length; p++) {
    const pageId = pageObjIds[p];
    const contentId = contentObjIds[p];
    const pageLines = pages[p];

    const streamOps: string[] = ['BT', '/F1 10.5 Tf', '54 744 Td', '14 TL'];
    if (p === 0 && title) {
      streamOps.push(`/F1 13 Tf (${escapePdfString(title)}) Tj T* /F1 10.5 Tf T*`);
    }
    for (const ln of pageLines) {
      streamOps.push(`(${escapePdfString(ln)}) Tj T*`);
    }
    streamOps.push('ET');
    const streamStr = streamOps.join('\n');

    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`
    );
    objects.push(
      `${contentId} 0 obj\n<< /Length ${Buffer.byteLength(streamStr, 'utf8')} >>\nstream\n${streamStr}\nendstream\nendobj\n`
    );
  }

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

/**
 * Extracts readable text strings from an uploaded PDF Buffer (handles both uncompressed and FlateDecode streams).
 */
export function extractTextFromPdfBuffer(buffer: Buffer): string {
  const raw = buffer.toString('latin1');
  const collected: string[] = [];

  const extractStringsFromContent = (content: string) => {
    const tjMatches = content.match(/\(([^()]*)\)\s*Tj/g) || [];
    for (const m of tjMatches) {
      const inner = m.slice(1, m.lastIndexOf(')'));
      if (inner.trim()) collected.push(inner.replace(/\\([()\\])/g, '$1'));
    }
    const tjArrMatches = content.match(/\[(.*?)\]\s*TJ/gs) || [];
    for (const arr of tjArrMatches) {
      const parts = arr.match(/\(([^()]*)\)/g) || [];
      const line = parts.map((p) => p.slice(1, -1).replace(/\\([()\\])/g, '$1')).join('');
      if (line.trim()) collected.push(line);
    }
  };

  // Scan PDF streams
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(raw)) !== null) {
    const streamRaw = match[1];
    try {
      const inflated = zlib.inflateSync(Buffer.from(streamRaw, 'latin1')).toString('latin1');
      extractStringsFromContent(inflated);
    } catch (_) {
      extractStringsFromContent(streamRaw);
    }
  }

  if (collected.length === 0) {
    extractStringsFromContent(raw);
  }

  return collected.join(' ').replace(/\s+/g, ' ').trim().slice(0, 48000);
}
