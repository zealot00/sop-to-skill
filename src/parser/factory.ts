import { readFile } from 'fs/promises';
import { extname } from 'path';
import type { ParsedContent } from './types.js';
import { parseMarkdown } from './markdown.js';
import { extractTables, tablesToMarkdown } from './table-parser.js';

async function parsePdf(content: Buffer): Promise<ParsedContent> {
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(content);
  
  const tables = extractTables(data.text);
  const tablesMd = tablesToMarkdown(tables);
  
  const contentWithTables = tables.length > 0 
    ? data.text + '\n\n## 提取的表格\n\n' + tablesMd
    : data.text;

  return {
    content: contentWithTables,
    metadata: {
      fileType: 'pdf',
      tablesCount: tables.length,
    },
    sections: [],
  };
}

async function parseDocx(content: Buffer): Promise<ParsedContent> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer: content });

  return {
    content: result.value,
    metadata: {
      fileType: 'docx',
    },
    sections: [],
  };
}

export async function parseInputFile(filePath: string): Promise<ParsedContent> {
  const ext = extname(filePath).toLowerCase();
  const content = await readFile(filePath);

  switch (ext) {
    case '.md':
    case '.markdown':
      const rawContent = content.toString('utf-8');
      return parseMarkdown(rawContent);

    case '.pdf':
      return parsePdf(content);

    case '.docx':
      return parseDocx(content);

    default:
      return {
        content: content.toString('utf-8'),
        metadata: {
          fileType: 'unknown',
        },
        sections: [],
      };
  }
}
