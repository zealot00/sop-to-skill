"""PDF Parser tests."""
import pytest
from pathlib import Path
from scripts.parser.pdf_parser import PdfParser
from scripts.models import ParsedDocument, Heading, Table, ListItem


class TestPdfParser:
    """Test suite for PdfParser."""

    def test_parser_interface_consistency(self, sops_dir):
        """Test that parser returns consistent ParsedDocument structure."""
        pdf_files = list(sops_dir.glob("*.pdf"))
        
        if not pdf_files:
            pytest.skip("No PDF test files found in fixtures/sops")
        
        parser = PdfParser()
        doc = parser.parse(str(pdf_files[0]))
        
        # Verify ParsedDocument structure
        assert isinstance(doc, ParsedDocument)
        assert isinstance(doc.headings, list)
        assert isinstance(doc.paragraphs, list)
        assert isinstance(doc.tables, list)
        assert isinstance(doc.lists, list)
        
        # Verify heading structure
        for h in doc.headings:
            assert isinstance(h, Heading)
            assert isinstance(h.level, int)
            assert isinstance(h.text, str)

    def test_parse_headings(self, sops_dir):
        """Test heading extraction from PDF."""
        pdf_files = list(sops_dir.glob("*.pdf"))
        if not pdf_files:
            pytest.skip("No PDF test files found")
        
        parser = PdfParser()
        doc = parser.parse(str(pdf_files[0]))
        
        for h in doc.headings:
            assert h.level >= 1
            assert len(h.text) > 0

    def test_parse_tables(self, sops_dir):
        """Test table extraction from PDF."""
        pdf_files = list(sops_dir.glob("*.pdf"))
        if not pdf_files:
            pytest.skip("No PDF test files found")
        
        parser = PdfParser()
        doc = parser.parse(str(pdf_files[0]))
        
        for t in doc.tables:
            assert isinstance(t, Table)

    def test_parse_non_existent_file(self):
        """Test handling of non-existent file."""
        parser = PdfParser()
        
        with pytest.raises(FileNotFoundError):
            parser.parse("/non/existent/file.pdf")
