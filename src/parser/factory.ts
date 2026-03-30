import { readFile } from 'fs/promises';
import { extname } from 'path';
import type { ParsedContent } from './types.js';
import { parseMarkdown } from './markdown.js';

async function parsePdf(filePath: string, content: Buffer): Promise<ParsedContent> {
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(content);

  return {
    content: data.text,
    metadata: {
      fileType: 'pdf',
    },
    sections: [],
  };
}

async function parseDocx(filePath: string, content: Buffer): Promise<ParsedContent> {
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
      return parsePdf(filePath, content);

    case '.docx':
      return parseDocx(filePath, content);

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