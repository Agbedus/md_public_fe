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
  ink: '#172033',
  muted: '#687386',
  subtle: '#8B95A7',
  line: '#E5EAF0',
  panel: '#F5F7FA',
  accent: '#6366F1',
  accentSoft: '#EEF2FF',
  success: '#10B981',
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
    doc.rect(x, y, width, rowHeight).fill(rowIndex === 0 ? COLORS.accentSoft : rowIndex % 2 ? COLORS.white : COLORS.panel);
    normalized.forEach((cell, columnIndex) => {
      doc
        .font(rowIndex === 0 ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(8.5)
        .fillColor(rowIndex === 0 ? COLORS.accent : COLORS.ink)
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
      const sizes = [22, 16, 12.5, 10.5];
      const headingHeight = doc
        .font('Helvetica-Bold')
        .fontSize(sizes[level - 1])
        .heightOfString(heading[2].replace(/\*\*/g, ''), { width: bodyWidth - (level === 2 ? 12 : 0), lineGap: 2 });
      const followingHeight = nextLine && !/^#{1,4}\s+/.test(nextLine)
        ? doc.font('Helvetica').fontSize(9.75).heightOfString(nextLine.replace(/[*`]/g, ''), { width: bodyWidth, lineGap: 3.5 }) + 12
        : 0;
      ensureSpace(doc, headingHeight + followingHeight + (level <= 2 ? 34 : 22));
      doc.moveDown(level === 1 ? 0.55 : 0.85);
      if (level === 2) {
        doc.roundedRect(PAGE.left, doc.y + 1, 4, 18, 2).fill(COLORS.accent);
      }
      doc
        .font('Helvetica-Bold')
        .fontSize(sizes[level - 1])
        .fillColor(level === 1 ? COLORS.ink : level === 2 ? COLORS.accent : COLORS.ink)
        .text(heading[2].replace(/\*\*/g, ''), PAGE.left + (level === 2 ? 12 : 0), doc.y, {
          width: bodyWidth - (level === 2 ? 12 : 0),
          lineGap: 2,
        });
      doc.moveDown(level <= 2 ? 0.45 : 0.25);
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
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLORS.accent).text(bullet ? '•' : `${numbered?.[1]}.`, PAGE.left + 5, y, { width: 18 });
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

    const paragraphHeight = doc.font('Helvetica').fontSize(9.75).heightOfString(line.replace(/[*`]/g, ''), { width: bodyWidth, lineGap: 3.5 });
    ensureSpace(doc, paragraphHeight + 10);
    writeInline(doc, line, PAGE.left, doc.y, bodyWidth, { fontSize: 9.75, lineGap: 3.5 });
    doc.moveDown(0.42);
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
    if (logo) doc.image(logo, PAGE.left, 27, { fit: [108, 32], valign: 'center' });
    else doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.ink).text('MyndDesk', PAGE.left, 31);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.subtle).text('PIP AI REPORT', PAGE.width - PAGE.right - 90, 35, { width: 90, align: 'right', characterSpacing: 1.1 });
    doc.moveTo(PAGE.left, 69).lineTo(PAGE.width - PAGE.right, 69).strokeColor(COLORS.line).lineWidth(0.8).stroke();
    doc.y = PAGE.top;
  };

  drawPageHeader();
  doc.on('pageAdded', drawPageHeader);

  doc
    .font('Helvetica-Bold')
    .fontSize(25)
    .fillColor(COLORS.ink)
    .text(title, PAGE.left, PAGE.top, { width: PAGE.width - PAGE.left - PAGE.right, lineGap: 3 });
  doc.moveDown(0.45);
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(
    [
      input.organizationName ? `Workspace: ${input.organizationName}` : null,
      input.preparedFor ? `Prepared for: ${input.preparedFor}` : null,
      `Generated ${generatedAt.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}`,
    ].filter(Boolean).join('   •   '),
    { lineGap: 2 },
  );
  doc.moveDown(0.9);
  const introY = doc.y;
  doc.roundedRect(PAGE.left, introY, PAGE.width - PAGE.left - PAGE.right, 42, 8).fill(COLORS.accentSoft);
  doc.roundedRect(PAGE.left + 12, introY + 12, 18, 18, 9).fill(COLORS.success);
  doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COLORS.white).text('AI', PAGE.left + 15.5, introY + 16.2, { width: 11, align: 'center' });
  doc.font('Helvetica').fontSize(8.8).fillColor(COLORS.muted).text('Generated from the MyndDesk workspace data available to this user at the time of the request.', PAGE.left + 40, introY + 12, { width: PAGE.width - PAGE.left - PAGE.right - 54, lineGap: 2 });
  doc.y = introY + 52;

  renderMarkdown(doc, bodyContent);

  const range = doc.bufferedPageRange();
  for (let pageIndex = 0; pageIndex < range.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const footerY = PAGE.height - 39;
    doc.moveTo(PAGE.left, footerY - 10).lineTo(PAGE.width - PAGE.right, footerY - 10).strokeColor(COLORS.line).lineWidth(0.6).stroke();
    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.subtle).text('AI-generated content - review important details before acting.', PAGE.left, footerY, { width: 340, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.muted).text(`MYNDDESK  •  ${pageIndex + 1} / ${range.count}`, PAGE.width - PAGE.right - 110, footerY, { width: 110, align: 'right', characterSpacing: 0.5, lineBreak: false });
    doc.page.margins.bottom = originalBottomMargin;
  }

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}
