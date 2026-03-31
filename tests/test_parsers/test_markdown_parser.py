"""Markdown Parser tests."""
import pytest
from scripts.parser.markdown_parser import MarkdownParser
from scripts.models import ParsedDocument, Heading, Table, ListItem


class TestMarkdownParser:
    """Test suite for MarkdownParser."""

    def test_parse_headings(self, simple_sop_markdown):
        """Test heading hierarchy extraction."""
        parser = MarkdownParser()
        doc = parser.parse(simple_sop_markdown)
        
        # Verify heading levels and text
        assert len(doc.headings) >= 3
        
        # Find main title (level 1)
        h1 = next((h for h in doc.headings if h.level == 1), None)
        assert h1 is not None
        assert "折扣" in h1.text
        
        # Find section headings (level 2)
        h2_list = [h for h in doc.headings if h.level == 2]
        assert len(h2_list) >= 2
        
        # Find subsection headings (level 3)
        h3_list = [h for h in doc.headings if h.level == 3]
        assert len(h3_list) >= 2

    def test_parse_tables(self, sop_with_table):
        """Test table extraction."""
        parser = MarkdownParser()
        doc = parser.parse(sop_with_table)
        
        assert len(doc.tables) >= 1
        table = doc.tables[0]
        assert len(table.headers) >= 2
        assert len(table.rows) >= 1
        # Verify content
        assert "角色" in table.headers
        assert "审批金额上限" in table.headers

    def test_parse_lists(self, simple_sop_markdown):
        """Test list item extraction."""
        parser = MarkdownParser()
        doc = parser.parse(simple_sop_markdown)
        
        # Find list items in the document
        assert len(doc.lists) >= 1
        
        # Check for unordered list items (客户等级 A)
        unordered = [item for item in doc.lists if item.list_type == "unordered"]
        assert len(unordered) >= 2
        
        # Check for ordered list items (审批流程)
        ordered = [item for item in doc.lists if item.list_type == "ordered"]
        assert len(ordered) >= 2

    def test_parse_paragraphs(self, simple_sop_markdown):
        """Test paragraph extraction."""
        parser = MarkdownParser()
        doc = parser.parse(simple_sop_markdown)
        
        assert len(doc.paragraphs) >= 1
        # Check that some meaningful text is captured
        all_text = " ".join(doc.paragraphs)
        assert len(all_text) > 10

    def test_parser_interface_consistency(self, simple_sop_markdown):
        """Test that parser returns consistent ParsedDocument structure."""
        parser = MarkdownParser()
        doc = parser.parse(simple_sop_markdown)
        
        # Verify ParsedDocument structure
        assert isinstance(doc, ParsedDocument)
        assert isinstance(doc.headings, list)
        assert isinstance(doc.paragraphs, list)
        assert isinstance(doc.tables, list)
        assert isinstance(doc.lists, list)
        assert isinstance(doc.metadata, dict)
        
        # Verify heading structure
        for h in doc.headings:
            assert isinstance(h, Heading)
            assert isinstance(h.level, int)
            assert isinstance(h.text, str)
            assert h.level > 0
        
        # Verify table structure
        for t in doc.tables:
            assert isinstance(t, Table)
            assert isinstance(t.headers, list)
            assert isinstance(t.rows, list)

    def test_parse_empty_content(self):
        """Test parsing empty content."""
        parser = MarkdownParser()
        doc = parser.parse("")
        
        assert doc.headings == []
        assert doc.paragraphs == []
        assert doc.tables == []
        assert doc.lists == []

    def test_parse_plain_text_only(self):
        """Test parsing plain text without markdown elements."""
        parser = MarkdownParser()
        doc = parser.parse("这是一段普通文本。")
        
        assert len(doc.paragraphs) >= 1
        assert doc.headings == []
        assert doc.tables == []
