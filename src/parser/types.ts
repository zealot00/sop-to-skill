export interface ParsedContent {
  content: string;
  metadata: {
    title?: string;
    version?: string;
    date?: string;
    fileType: 'markdown' | 'pdf' | 'docx' | 'unknown';
    tablesCount?: number;
    [key: string]: unknown;
  };
  sections: ParsedSection[];
}

export interface ParsedSection {
  title: string;
  level: number;
  content: string;
  children: ParsedSection[];
}