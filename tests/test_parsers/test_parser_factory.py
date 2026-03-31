"""Parser Factory tests."""
import pytest
from scripts.parser.factory import ParserFactory, get_parser_for_file
from scripts.parser.markdown_parser import MarkdownParser
from scripts.parser.docx_parser import DocxParser
from scripts.parser.pdf_parser import PdfParser


class TestParserFactory:
    """Test suite for ParserFactory."""

    def test_get_markdown_parser(self):
        """Test getting parser for .md files."""
        parser = ParserFactory.get_parser("test.md")
        assert isinstance(parser, MarkdownParser)

    def test_get_markdown_parser_uppercase(self):
        """Test getting parser for .MD files (uppercase)."""
        parser = ParserFactory.get_parser("test.MD")
        assert isinstance(parser, MarkdownParser)

    def test_get_docx_parser(self):
        """Test getting parser for .docx files."""
        parser = ParserFactory.get_parser("test.docx")
        assert isinstance(parser, DocxParser)

    def test_get_pdf_parser(self):
        """Test getting parser for .pdf files."""
        parser = ParserFactory.get_parser("test.pdf")
        assert isinstance(parser, PdfParser)

    def test_get_parser_for_file_helper(self):
        """Test the convenience function get_parser_for_file."""
        parser = get_parser_for_file("document.md")
        assert isinstance(parser, MarkdownParser)
        
        parser = get_parser_for_file("document.docx")
        assert isinstance(parser, DocxParser)
        
        parser = get_parser_for_file("document.pdf")
        assert isinstance(parser, PdfParser)

    def test_unsupported_file_type(self):
        """Test handling of unsupported file types."""
        with pytest.raises(ValueError):
            ParserFactory.get_parser("test.txt")
