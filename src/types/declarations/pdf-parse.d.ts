declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown> | null;
    text: string;
    version: string | null;
  }

  interface PDFOptions {
    pagerender?: (pageData: { getTextContent: () => Promise<unknown> }) => Promise<string>;
    max?: number;
    version?: string;
  }

  function pdfParse(
    dataBuffer: Buffer | ArrayBuffer,
    options?: PDFOptions
  ): Promise<PDFData>;

  export = pdfParse;
}