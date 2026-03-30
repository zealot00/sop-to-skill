export interface ParsedContent {
  content: string;
  metadata: {
    title?: string;
    version?: string;
    date?: string;
    fileType: 'markdown' | 'pdf' | 'docx' | 'unknown';
  };
  sections: ParsedSection[];
}

export interface ParsedSection {
  title: string;
  level: number;
  content: string;
  children: ParsedSection[];
}