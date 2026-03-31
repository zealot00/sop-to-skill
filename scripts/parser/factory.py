"""Parser Factory for creating appropriate parser instances."""
from pathlib import Path
from typing import Dict, Type
from scripts.parser.base import BaseParser
from scripts.parser.markdown_parser import MarkdownParser
from scripts.parser.docx_parser import DocxParser
from scripts.parser.pdf_parser import PdfParser


class ParserFactory:
    """Factory for creating document parsers based on file extension."""
    
    _parsers: Dict[str, Type[BaseParser]] = {
        '.md': MarkdownParser,
        '.markdown': MarkdownParser,
        '.docx': DocxParser,
        '.pdf': PdfParser,
    }
    
    @classmethod
    def get_parser(cls, file_path: str) -> BaseParser:
        """Get an appropriate parser for the given file.
        
        Args:
            file_path: Path to the file to parse.
            
        Returns:
            Parser instance appropriate for the file type.
            
        Raises:
            ValueError: If the file type is not supported.
        """
        ext = Path(file_path).suffix.lower()
        
        parser_class = cls._parsers.get(ext)
        if parser_class is None:
            supported = ', '.join(cls._parsers.keys())
            raise ValueError(
                f"Unsupported file type: '{ext}'. "
                f"Supported types: {supported}"
            )
        
        return parser_class()


def get_parser_for_file(file_path: str) -> BaseParser:
    """Convenience function to get a parser for a file.
    
    Args:
        file_path: Path to the file to parse.
        
    Returns:
        Parser instance appropriate for the file type.
        
    Raises:
        ValueError: If the file type is not supported.
    """
    return ParserFactory.get_parser(file_path)
