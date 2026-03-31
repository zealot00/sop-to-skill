"""Markdown parser implementation."""
import re
from typing import List, Optional
from scripts.parser.base import BaseParser
from scripts.models import ParsedDocument, Heading, Table, ListItem


class MarkdownParser(BaseParser):
    """Parser for Markdown documents."""
    
    def parse(self, source: str) -> ParsedDocument:
        """Parse Markdown content into a ParsedDocument.
        
        Args:
            source: Markdown text content.
            
        Returns:
            ParsedDocument with extracted headings, tables, lists, and paragraphs.
        """
        doc = self._create_empty_document()
        doc.raw_text = source
        
        lines = source.split('\n')
        
        # Track list context
        in_list = False
        current_list_type = None
        current_list_level = 0
        current_list_items = []
        
        i = 0
        while i < len(lines):
            line = lines[i]
            stripped = line.strip()
            
            if not stripped:
                # Empty line - flush any pending list
                if current_list_items:
                    doc.lists.extend(current_list_items)
                    current_list_items = []
                in_list = False
                i += 1
                continue
            
            # Check for headings
            heading_match = re.match(r'^(#{1,6})\s+(.+)$', stripped)
            if heading_match:
                level = len(heading_match.group(1))
                text = heading_match.group(2).strip()
                doc.headings.append(Heading(level=level, text=text, line_number=i + 1))
                i += 1
                continue
            
            # Check for table
            if stripped.startswith('|'):
                table = self._extract_table(lines, i)
                if table:
                    doc.tables.append(table)
                    i += len(table.rows) + 2  # +2 for header and separator
                    continue
            
            # Check for list items
            list_match = re.match(r'^(\s*)([-*+]|\d+\.)\s+(.+)$', stripped)
            if list_match:
                indent = len(list_match.group(1))
                marker = list_match.group(2)
                text = list_match.group(3).strip()
                
                list_type = "ordered" if marker[-1] == '.' else "unordered"
                
                # Determine list level by indent
                list_level = indent // 2
                
                doc.lists.append(ListItem(
                    text=text,
                    list_type=list_type,
                    level=list_level
                ))
                in_list = True
                i += 1
                continue
            
            # Otherwise it's a paragraph
            if not stripped.startswith('#') and not stripped.startswith('|'):
                # Collect paragraph lines
                paragraph_lines = []
                while i < len(lines) and lines[i].strip() and \
                      not re.match(r'^(#{1,6})\s+', lines[i].strip()) and \
                      not lines[i].strip().startswith('|') and \
                      not re.match(r'^(\s*)([-*+]|\d+\.)\s+', lines[i].strip()):
                    paragraph_lines.append(lines[i].strip())
                    i += 1
                
                if paragraph_lines:
                    paragraph_text = ' '.join(paragraph_lines)
                    if paragraph_text:
                        doc.paragraphs.append(paragraph_text)
                continue
            
            i += 1
        
        # Flush any remaining list items
        if current_list_items:
            doc.lists.extend(current_list_items)
        
        return doc
    
    def _extract_table(self, lines: List[str], start_idx: int) -> Optional[Table]:
        """Extract a markdown table starting at given line index.
        
        Args:
            lines: All lines from the document.
            start_idx: Starting line index of the table.
            
        Returns:
            Table object if valid table found, None otherwise.
        """
        table_lines = []
        i = start_idx
        
        while i < len(lines) and lines[i].strip().startswith('|'):
            table_lines.append(lines[i].strip())
            i += 1
        
        if len(table_lines) < 2:
            return None
        
        # Parse header
        headers = self._parse_table_row(table_lines[0])
        
        # Skip separator line if present
        data_start = 1
        if len(table_lines) > 1 and re.match(r'^\|\|?[\s\-:|]+\|?$', table_lines[1]):
            data_start = 2
        
        # Parse data rows
        rows = []
        for j in range(data_start, len(table_lines)):
            row = self._parse_table_row(table_lines[j])
            if row:
                rows.append(row)
        
        return Table(headers=headers, rows=rows)
    
    def _parse_table_row(self, line: str) -> List[str]:
        """Parse a single table row.
        
        Args:
            line: Table row line (with | markers).
            
        Returns:
            List of cell values.
        """
        # Remove leading/trailing | and split
        line = line.strip('|')
        cells = line.split('|')
        return [cell.strip() for cell in cells]
