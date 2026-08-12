import fs from 'node:fs';
import path from 'node:path';

import PDFDocument from 'pdfkit';

export interface AssistantReportPdfInput {
  content: string;
  title?: string;
  generatedAt?: Date;
  organizationName?: string | null;
  preparedFor?: string | null;
}

const COLORS = {
  ink: '#14213D',
  navy: '#101C33',
  muted: '#5E6A7B',
  subtle: '#8490A3',
  line: '#DCE2EA',
  panel: '#F4F6F9',
  accent: '#4F46E5',
  accentSoft: '#EEF0FF',
  success: '#0F766E',
  gold: '#B78A3C',
  white: '#FFFFFF',
};

const PAGE = {
  width: 595.28,
  height: 841.89,
  left: 54,
  right: 54,
  top: 92,
  bottom: 62,
};

function cleanMarkdown(value: string): string {
  return value
    .replace(/__WIDGET__[\s\S]*?__WIDGET__/g, '')
    .replace(/__REPORT__/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

function reportTitle(content: string, fallback?: string): string {
  if (fallback?.trim()) return fallback.trim().replace(/^#+\s*/, '').slice(0, 140);
  const heading = content.split('\n').find((line) => /^#{1,2}\s+/.test(line.trim()));
  return heading?.replace(/^#+\s*/, '').trim().slice(0, 140) || 'AI Productivity Report';
}

function logoPath(): string | null {
  const candidate = path.join(process.cwd(), 'public', 'mynd_desk_logo_light.png');
  return fs.existsSync(candidate) ? candidate : null;
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number): void {
  if (doc.y + height > PAGE.height - PAGE.bottom) doc.addPage();
}

function writeInline(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  options: PDFKit.Mixins.TextOptions & { fontSize?: number } = {},
): void {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g).filter(Boolean);
  if (!tokens.length) return;

  const { fontSize = 9.75, ...baseOptions } = options;
  tokens.forEach((token, index) => {
    const continued = index < tokens.length - 1;
    let value = token;
    let font = 'Helvetica';
    let color = COLORS.ink;
    let underline = false;
    let link: string | undefined;

    if (token.startsWith('**') && token.endsWith('**')) {
      value = token.slice(2, -2);
      font = 'Helvetica-Bold';
    } else if (token.startsWith('*') && token.endsWith('*')) {
      value = token.slice(1, -1);
      font = 'Helvetica-Oblique';
    } else if (token.startsWith('`') && token.endsWith('`')) {
      value = token.slice(1, -1);
      font = 'Courier';
      color = COLORS.accent;
    } else {
      const match = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        value = match[1];
        link = match[2];
        color = COLORS.accent;
        underline = true;
      }
    }

    doc.font(font).fontSize(fontSize).fillColor(color);
    const textOptions = { ...baseOptions, width, continued, underline, link };
    if (index === 0) doc.text(value, x, y, textOptions);
    else doc.text(value, textOptions);
  });
  doc.font('Helvetica').fontSize(fontSize).fillColor(COLORS.ink);
}

function renderTable(doc: PDFKit.PDFDocument, rows: string[][]): void {
  if (!rows.length) return;
  const x = PAGE.left;
  const width = PAGE.width - PAGE.left - PAGE.right;
  const columns = Math.max(...rows.map((row) => row.length));
  const columnWidth = width / columns;

  rows.forEach((row, rowIndex) => {
    const normalized = Array.from({ length: columns }, (_, index) => row[index] || '');
    const rowHeight = Math.max(
      30,
      ...normalized.map((cell) => doc.font(rowIndex === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).heightOfString(cell, { width: columnWidth - 16 }) + 16),
    );
    ensureSpace(doc, rowHeight + 4);
    const y = doc.y;
    doc.rect(x, y, width, rowHeight).fill(rowIndex === 0 ? COLORS.navy : rowIndex % 2 ? COLORS.white : COLORS.panel);
    normalized.forEach((cell, columnIndex) => {
      doc
        .font(rowIndex === 0 ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(8.5)
        .fillColor(rowIndex === 0 ? COLORS.white : COLORS.ink)
        .text(cell, x + columnIndex * columnWidth + 8, y + 8, { width: columnWidth - 16, lineGap: 2 });
    });
    doc.y = y + rowHeight;
    doc.moveTo(x, doc.y).lineTo(x + width, doc.y).strokeColor(COLORS.line).lineWidth(0.5).stroke();
  });
  doc.moveDown(0.8);
}

function renderMarkdown(doc: PDFKit.PDFDocument, content: string): void {
  const lines = content.split('\n');
  const bodyWidth = PAGE.width - PAGE.left - PAGE.right;
  let isExecutiveSummaryParagraph = false;

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line) {
      doc.moveDown(0.45);
      continue;
    }

    const nextLine = lines[index + 1]?.trim() || '';
    if (line.includes('|') && /^\|?\s*:?-{3,}/.test(nextLine)) {
      const rows: string[][] = [];
      rows.push(line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()));
      index += 2;
      while (index < lines.length && lines[index].includes('|')) {
        rows.push(lines[index].trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()));
        index += 1;
      }
      index -= 1;
      renderTable(doc, rows);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const headingText = heading[2].replace(/\*\*/g, '');
      const sizes = [20, 15, 11.5, 10];
      const headingHeight = doc
        .font('Helvetica-Bold')
        .fontSize(sizes[level - 1])
        .heightOfString(headingText, { width: bodyWidth - (level === 2 ? 16 : 0), lineGap: 2 });
      const followingHeight = nextLine && !/^#{1,4}\s+/.test(nextLine)
        ? doc.font('Helvetica').fontSize(9.75).heightOfString(nextLine.replace(/[*`]/g, ''), { width: bodyWidth, lineGap: 3.5 }) + 12
        : 0;
      ensureSpace(doc, headingHeight + followingHeight + (level <= 2 ? 34 : 22));
      doc.moveDown(level === 1 ? 0.5 : 0.8);
      if (level === 2) {
        doc.rect(PAGE.left, doc.y + 2, 3, 15).fill(COLORS.gold);
      }
      doc
        .font('Helvetica-Bold')
        .fontSize(sizes[level - 1])
        .fillColor(COLORS.ink)
        .text(headingText, PAGE.left + (level === 2 ? 14 : 0), doc.y, {
          width: bodyWidth - (level === 2 ? 14 : 0),
          lineGap: 2,
        });
      if (level <= 2) {
        doc.moveTo(PAGE.left, doc.y + 4).lineTo(PAGE.width - PAGE.right, doc.y + 4).strokeColor(COLORS.line).lineWidth(0.6).stroke();
      }
      doc.moveDown(level <= 2 ? 0.45 : 0.25);
      isExecutiveSummaryParagraph = level <= 2 && /executive summary/i.test(headingText);
      continue;
    }

    if (/^([-*_])\1{2,}$/.test(line)) {
      doc.moveDown(0.4).moveTo(PAGE.left, doc.y).lineTo(PAGE.width - PAGE.right, doc.y).strokeColor(COLORS.line).lineWidth(0.8).stroke().moveDown(0.6);
      continue;
    }

    const bullet = line.match(/^[-*+]\s+(.+)$/);
    const numbered = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (bullet || numbered) {
      const listText = bullet?.[1] || numbered?.[2] || '';
      const listHeight = doc.font('Helvetica').fontSize(9.5).heightOfString(listText.replace(/[*`]/g, ''), { width: bodyWidth - 24, lineGap: 3 });
      ensureSpace(doc, listHeight + 12);
      const y = doc.y;
      if (bullet) doc.circle(PAGE.left + 9, y + 5, 2).fill(COLORS.accent);
      else doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLORS.accent).text(`${numbered?.[1]}.`, PAGE.left + 4, y, { width: 18 });
      writeInline(doc, listText, PAGE.left + 24, y, bodyWidth - 24, { fontSize: 9.5, lineGap: 3 });
      doc.moveDown(0.3);
      continue;
    }

    const quote = line.match(/^>\s*(.+)$/);
    if (quote) {
      const quoteHeight = doc.font('Helvetica-Oblique').fontSize(9.5).heightOfString(quote[1], { width: bodyWidth - 28, lineGap: 3 }) + 18;
      ensureSpace(doc, quoteHeight);
      const y = doc.y;
      doc.roundedRect(PAGE.left, y, bodyWidth, quoteHeight, 6).fill(COLORS.panel);
      doc.rect(PAGE.left, y, 4, quoteHeight).fill(COLORS.accent);
      doc.font('Helvetica-Oblique').fontSize(9.5).fillColor(COLORS.muted).text(quote[1], PAGE.left + 16, y + 9, { width: bodyWidth - 28, lineGap: 3 });
      doc.y = y + quoteHeight + 8;
      continue;
    }

    const paragraphWidth = isExecutiveSummaryParagraph ? bodyWidth - 34 : bodyWidth;
    const paragraphHeight = doc.font('Helvetica').fontSize(isExecutiveSummaryParagraph ? 10 : 9.75).heightOfString(
      line.replace(/[*`]/g, ''),
      { width: paragraphWidth, lineGap: isExecutiveSummaryParagraph ? 4 : 3.5 },
    );
    if (isExecutiveSummaryParagraph) {
      const panelHeight = paragraphHeight + 28;
      ensureSpace(doc, panelHeight + 10);
      const y = doc.y;
      doc.roundedRect(PAGE.left, y, bodyWidth, panelHeight, 7).fill(COLORS.accentSoft);
      doc.rect(PAGE.left, y, 4, panelHeight).fill(COLORS.accent);
      writeInline(doc, line, PAGE.left + 18, y + 14, bodyWidth - 34, { fontSize: 10, lineGap: 4 });
      doc.y = y + panelHeight + 7;
      isExecutiveSummaryParagraph = false;
    } else {
      ensureSpace(doc, paragraphHeight + 10);
      writeInline(doc, line, PAGE.left, doc.y, bodyWidth, { fontSize: 9.75, lineGap: 3.5 });
      doc.moveDown(0.42);
    }
  }
}

export function createAssistantReportPdf(input: AssistantReportPdfInput): Promise<Buffer> {
  const content = cleanMarkdown(input.content);
  if (!content) throw new Error('Report content is empty.');

  const title = reportTitle(content, input.title);
  const bodyContent = content.replace(/^#\s+[^\n]+\n*/i, '').trim();
  const generatedAt = input.generatedAt || new Date();
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: PAGE.top, right: PAGE.right, bottom: PAGE.bottom, left: PAGE.left },
    bufferPages: true,
    info: {
      Title: title,
      Author: 'MyndDesk Pip AI',
      Subject: 'AI-generated productivity report',
      Creator: 'MyndDesk',
      CreationDate: generatedAt,
    },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const drawPageHeader = () => {
    const logo = logoPath();
    if (logo) doc.image(logo, PAGE.left, 24, { fit: [102, 30], valign: 'center' });
    else doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.ink).text('MyndDesk', PAGE.left, 29);
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.subtle).text('CONFIDENTIAL  /  WORKSPACE INTELLIGENCE', PAGE.width - PAGE.right - 210, 34, { width: 210, align: 'right', characterSpacing: 0.8 });
    doc.moveTo(PAGE.left, 67).lineTo(PAGE.width - PAGE.right, 67).strokeColor(COLORS.line).lineWidth(0.7).stroke();
  };

  doc.y = PAGE.top;

  const bodyWidth = PAGE.width - PAGE.left - PAGE.right;
  const titleHeight = doc.font('Helvetica-Bold').fontSize(24).heightOfString(title, { width: bodyWidth - 46, lineGap: 3 });
  const mastheadY = PAGE.top;
  const mastheadHeight = Math.max(124, titleHeight + 72);
  doc.roundedRect(PAGE.left, mastheadY, bodyWidth, mastheadHeight, 9).fill(COLORS.navy);
  doc.rect(PAGE.left, mastheadY, 6, mastheadHeight).fill(COLORS.gold);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#C9D2E1').text('MYNDDESK  /  PIP AI REPORT', PAGE.left + 26, mastheadY + 22, { characterSpacing: 1.2 });
  doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.white).text(title, PAGE.left + 26, mastheadY + 47, { width: bodyWidth - 52, lineGap: 3 });

  const metadataY = mastheadY + mastheadHeight + 14;
  const metadata = [
    { label: 'WORKSPACE', value: String(input.organizationName || 'MyndDesk') },
    { label: 'PREPARED FOR', value: String(input.preparedFor || 'Authorized user') },
    { label: 'ISSUED', value: generatedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
  ];
  const metadataWidth = bodyWidth / metadata.length;
  metadata.forEach((item, index) => {
    const x = PAGE.left + index * metadataWidth;
    if (index > 0) doc.moveTo(x, metadataY + 2).lineTo(x, metadataY + 42).strokeColor(COLORS.line).lineWidth(0.6).stroke();
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COLORS.subtle).text(item.label, x + (index > 0 ? 14 : 0), metadataY + 2, { width: metadataWidth - 14, characterSpacing: 1 });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.ink).text(item.value, x + (index > 0 ? 14 : 0), metadataY + 18, { width: metadataWidth - 16, lineGap: 2 });
  });

  const provenanceY = metadataY + 54;
  doc.roundedRect(PAGE.left, provenanceY, bodyWidth, 38, 6).fill(COLORS.panel);
  doc.circle(PAGE.left + 18, provenanceY + 19, 4).fill(COLORS.success);
  doc.font('Helvetica').fontSize(8.3).fillColor(COLORS.muted).text('Prepared from the permission-scoped MyndDesk workspace data available at the time of generation.', PAGE.left + 32, provenanceY + 12, { width: bodyWidth - 46, lineGap: 2 });
  doc.y = provenanceY + 47;

  renderMarkdown(doc, bodyContent);

  const range = doc.bufferedPageRange();
  for (let pageIndex = 0; pageIndex < range.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    drawPageHeader();
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const footerY = PAGE.height - 45;
    doc.moveTo(PAGE.left, footerY - 10).lineTo(PAGE.width - PAGE.right, footerY - 10).strokeColor(COLORS.line).lineWidth(0.6).stroke();
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.subtle).text('CONFIDENTIAL - AI-generated content. Review material decisions before acting.', PAGE.left, footerY, { width: 360, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted).text(`MYNDDESK  /  ${pageIndex + 1} OF ${range.count}`, PAGE.width - PAGE.right - 120, footerY, { width: 120, align: 'right', characterSpacing: 0.5, lineBreak: false });
    doc.page.margins.bottom = originalBottomMargin;
  }

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

/**
 * Dependency-light layout fallback for production environments where an
 * optional image or rich-layout operation fails. It deliberately avoids
 * external images, tables, page buffering, and page switching while still
 * producing a readable, valid report PDF.
 */
export function createFallbackAssistantReportPdf(input: AssistantReportPdfInput): Promise<Buffer> {
  const content = cleanMarkdown(input.content);
  if (!content) throw new Error('Report content is empty.');

  const title = reportTitle(content, input.title);
  const generatedAt = input.generatedAt || new Date();
  const plainContent = content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .trim();
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 54, right: 54, bottom: 54, left: 54 },
    info: {
      Title: title,
      Author: 'MyndDesk Pip AI',
      Creator: 'MyndDesk',
      CreationDate: generatedAt,
    },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.ink).text(title, { lineGap: 3 });
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted).text(
    [
      input.organizationName ? `Workspace: ${String(input.organizationName)}` : null,
      input.preparedFor ? `Prepared for: ${String(input.preparedFor)}` : null,
      `Generated ${generatedAt.toLocaleString('en-GB')}`,
    ].filter(Boolean).join('  |  '),
  );
  doc.moveDown(0.8);
  doc.moveTo(54, doc.y).lineTo(541, doc.y).strokeColor(COLORS.line).stroke();
  doc.moveDown(0.8);
  doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.ink).text(plainContent, {
    align: 'left',
    lineGap: 3.5,
  });

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}
