import type { ParsedContent } from './types.js';

export function parseMarkdown(content: string): ParsedContent {
  const lines = content.split('\n');
  const title = extractTitle(lines);
  const sections = extractSections(content);

  return {
    content,
    metadata: {
      title,
      fileType: 'markdown',
    },
    sections,
  };
}

function extractTitle(lines: string[]): string | undefined {
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.slice(2).trim();
    }
  }
  return undefined;
}

function extractSections(content: string): ParsedContent['sections'] {
  const sections: ParsedContent['sections'] = [];
  const lines = content.split('\n');

  let currentSection: ParsedContent['sections'][0] | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        sections.push(currentSection);
      }
      currentSection = {
        title: headerMatch[2].trim(),
        level: headerMatch[1].length,
        content: '',
        children: [],
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim();
    sections.push(currentSection);
  }

  return sections;
}
