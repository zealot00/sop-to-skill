"""PDF parser implementation."""
from pathlib import Path
from typing import List
import pdfplumber
from scripts.parser.base import BaseParser
from scripts.models import ParsedDocument, Heading, Table, ListItem


class PdfParser(BaseParser):
    """Parser for PDF documents."""
    
    def parse(self, source: str) -> ParsedDocument:
        """Parse a PDF file into a ParsedDocument.
        
        Args:
            source: Path to the PDF file.
            
        Returns:
            ParsedDocument with extracted content.
            
        Raises:
            FileNotFoundError: If the PDF file doesn't exist.
        """
        path = Path(source)
        if not path.exists():
            raise FileNotFoundError(f"PDF file not found: {source}")
        
        doc = self._create_empty_document()
        
        with pdfplumber.open(str(path)) as pdf:
            doc.raw_text = ""
            
            for page_num, page in enumerate(pdf.pages, 1):
                text = page.extract_text() or ""
                doc.raw_text += text + "\n"
                
                # Extract headings from text
                self._extract_headings_from_text(doc, text, page_num)
                
                # Extract tables
                tables = page.extract_tables()
                for table_data in tables:
                    if table_data:
                        table_obj = self._convert_table_data(table_data)
                        doc.tables.append(table_obj)
        
        # Also try to extract structure from text
        self._extract_structure_from_text(doc, doc.raw_text)
        
        return doc
    
    def _extract_headings_from_text(self, doc: ParsedDocument, text: str, page_num: int) -> None:
        """Extract heading-like lines from text.
        
        Args:
            doc: ParsedDocument to append to.
            text: Text content to search.
            page_num: Current page number.
        """
        import re
        
        lines = text.split('\n')
        for line in lines:
            stripped = line.strip()
            
            # Check for numbered headings like "1. Title" or "1.1 Title"
            num_match = re.match(r'^(\d+(?:\.\d+)*)\.?\s+(.+)$', stripped)
            if num_match:
                # Check if it looks like a heading (short text followed by longer content)
                heading_text = num_match.group(2)
                
                # Simple heuristic: if the line is short and followed by content
                if len(heading_text) < 100:
                    level = len(num_match.group(1).split('.'))
                    if level > 6:
                        level = 6
                    
                    doc.headings.append(Heading(
                        level=level,
                        text=heading_text,
                        line_number=page_num
                    ))
    
    def _extract_structure_from_text(self, doc: ParsedDocument, text: str) -> None:
        """Extract document structure from text content.
        
        Args:
            doc: ParsedDocument to append to.
            text: Full text content.
        """
        import re
        
        lines = text.split('\n')
        
        for line in lines:
            stripped = line.strip()
            
            # Skip empty lines and table rows
            if not stripped or stripped.startswith('|') or re.match(r'^[-:\s]+$', stripped):
                continue
            
            # Check for markdown-style headings
            heading_match = re.match(r'^(#{1,6})\s+(.+)$', stripped)
            if heading_match:
                level = len(heading_match.group(1))
                text_content = heading_match.group(2)
                doc.headings.append(Heading(level=level, text=text_content))
                continue
            
            # Add remaining significant lines as paragraphs
            if len(stripped) > 20 and not stripped.startswith('#'):
                # Check if it looks like a sentence/paragraph
                if stripped.endswith('.') or stripped.endswith('：') or stripped.endswith(':'):
                    if stripped not in doc.paragraphs:
                        doc.paragraphs.append(stripped)
    
    def _convert_table_data(self, table_data: List[List[str]]) -> Table:
        """Convert pdfplumber table data to Table object.
        
        Args:
            table_data: Raw table data from pdfplumber.
            
        Returns:
            Table object with headers and rows.
        """
        if not table_data:
            return Table(headers=[], rows=[])
        
        # First row is usually headers
        headers = table_data[0] if table_data else []
        rows = table_data[1:] if len(table_data) > 1 else []
        
        # Clean up cells
        headers = [str(h).strip() if h else "" for h in headers]
        rows = [[str(c).strip() if c else "" for c in row] for row in rows]
        
        return Table(headers=headers, rows=rows)
