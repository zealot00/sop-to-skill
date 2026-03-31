"""Base parser interface for SOP to Skill conversion."""
from abc import ABC, abstractmethod
from typing import List
from scripts.models import ParsedDocument


class BaseParser(ABC):
    """Abstract base class for document parsers.
    
    All parsers must implement the parse method to convert
    a document into a ParsedDocument structure.
    """
    
    @abstractmethod
    def parse(self, source: str) -> ParsedDocument:
        """Parse a document from source.
        
        Args:
            source: File path or content string depending on parser type.
            
        Returns:
            ParsedDocument containing the parsed structure.
        """
        pass
    
    def _create_empty_document(self) -> ParsedDocument:
        """Create an empty ParsedDocument with default values.
        
        Returns:
            Empty ParsedDocument instance.
        """
        return ParsedDocument(
            headings=[],
            paragraphs=[],
            tables=[],
            lists=[],
            metadata={},
            raw_text=""
        )
