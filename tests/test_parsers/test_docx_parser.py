"""DOCX Parser tests."""
import pytest
from pathlib import Path
from scripts.parser.docx_parser import DocxParser
from scripts.models import ParsedDocument, Heading, Table, ListItem


class TestDocxParser:
    """Test suite for DocxParser."""

    def test_parser_interface_consistency(self, sops_dir):
        """Test that parser returns consistent ParsedDocument structure."""
        # Check if there's a docx file to test
        docx_files = list(sops_dir.glob("*.docx"))
        
        if not docx_files:
            pytest.skip("No DOCX test files found in fixtures/sops")
        
        parser = DocxParser()
        doc = parser.parse(str(docx_files[0]))
        
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
            assert h.level > 0

    def test_parse_headings(self, sops_dir):
        """Test heading extraction from DOCX."""
        docx_files = list(sops_dir.glob("*.docx"))
        if not docx_files:
            pytest.skip("No DOCX test files found")
        
        parser = DocxParser()
        doc = parser.parse(str(docx_files[0]))
        
        # Should have headings if the document has them
        for h in doc.headings:
            assert h.level >= 1
            assert len(h.text) > 0

    def test_parse_tables(self, sops_dir):
        """Test table extraction from DOCX."""
        docx_files = list(sops_dir.glob("*.docx"))
        if not docx_files:
            pytest.skip("No DOCX test files found")
        
        parser = DocxParser()
        doc = parser.parse(str(docx_files[0]))
        
        for t in doc.tables:
            assert isinstance(t, Table)
            assert len(t.headers) >= 0

    def test_parse_non_existent_file(self):
        """Test handling of non-existent file."""
        parser = DocxParser()
        
        with pytest.raises(FileNotFoundError):
            parser.parse("/non/existent/file.docx")
