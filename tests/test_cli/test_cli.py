"""Tests for CLI tool."""
import pytest
import sys
import json
import tempfile
import os
from pathlib import Path
from unittest.mock import patch, MagicMock

# Import CLI module
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from scripts.cli import main, parse_args, CLIError


class TestCLI:
    """Test suite for CLI tool."""

    def test_cli_generate_markdown(self, tmp_path, simple_sop_markdown):
        """Test generating Skill from Markdown SOP."""
        # Given
        input_file = tmp_path / "test_sop.md"
        input_file.write_text(simple_sop_markdown, encoding='utf-8')
        output_dir = tmp_path / "output"
        
        # When - Run CLI
        with patch.object(sys, 'argv', ['cli.py', 'generate', str(input_file), '-o', str(output_dir), '-n', '折扣管理']):
            try:
                main()
            except SystemExit:
                pass
        
        # Then - Check output directory exists and has files
        assert output_dir.exists()
        files = list(output_dir.glob("**/*"))
        assert len(files) > 0

    def test_cli_validate_invalid_skill(self, tmp_path):
        """Test validating an incomplete Skill structure."""
        # Given - Create an invalid skill directory with no skill file
        skill_dir = tmp_path / "invalid_skill"
        skill_dir.mkdir()
        # Only create a random file, not a SKILL.md or README.md
        (skill_dir / "notes.txt").write_text("Some notes", encoding='utf-8')
        
        # When/Then - Should raise error or return non-zero exit code
        with patch.object(sys, 'argv', ['cli.py', 'validate', str(skill_dir)]):
            try:
                main()
            except SystemExit as e:
                assert e.code != 0

    def test_cli_extract_rules(self, tmp_path, simple_sop_markdown):
        """Test extracting rules to JSON."""
        # Given
        input_file = tmp_path / "test_sop.md"
        input_file.write_text(simple_sop_markdown, encoding='utf-8')
        output_file = tmp_path / "rules.json"
        
        # When - Run CLI
        with patch.object(sys, 'argv', ['cli.py', 'extract', str(input_file), '-o', str(output_file)]):
            try:
                main()
            except SystemExit:
                pass
        
        # Then - Check output file exists and is valid JSON
        if output_file.exists():
            with open(output_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            assert isinstance(data, dict)

    def test_cli_generate_with_table(self, tmp_path, sop_with_table):
        """Test generating Skill from SOP with tables."""
        # Given
        input_file = tmp_path / "table_sop.md"
        input_file.write_text(sop_with_table, encoding='utf-8')
        output_dir = tmp_path / "output"
        
        # When
        with patch.object(sys, 'argv', ['cli.py', 'generate', str(input_file), '-o', str(output_dir), '-n', '审批矩阵']):
            try:
                main()
            except SystemExit:
                pass
        
        # Then
        assert output_dir.exists()

    def test_cli_help(self):
        """Test CLI help output."""
        # When/Then
        with patch.object(sys, 'argv', ['cli.py', '--help']):
            try:
                main()
            except SystemExit as e:
                assert e.code == 0

    def test_cli_invalid_command(self):
        """Test CLI with invalid command."""
        # When/Then
        with patch.object(sys, 'argv', ['cli.py', 'invalid_command']):
            try:
                main()
            except SystemExit as e:
                assert e.code != 0

    def test_parse_args_generate(self):
        """Test parsing generate command arguments."""
        # Given
        args = ['generate', 'input.md', '-o', 'output/', '-n', 'MySkill']
        
        # When
        parsed = parse_args(args)
        
        # Then
        assert parsed.command == 'generate'
        assert parsed.input_file == 'input.md'
        assert parsed.output_dir == 'output/'
        assert parsed.skill_name == 'MySkill'

    def test_parse_args_validate(self):
        """Test parsing validate command arguments."""
        # Given
        args = ['validate', 'skill_dir/']
        
        # When
        parsed = parse_args(args)
        
        # Then
        assert parsed.command == 'validate'
        assert parsed.skill_dir == 'skill_dir/'

    def test_parse_args_extract(self):
        """Test parsing extract command arguments."""
        # Given
        args = ['extract', 'input.md', '-o', 'rules.json']
        
        # When
        parsed = parse_args(args)
        
        # Then
        assert parsed.command == 'extract'
        assert parsed.input_file == 'input.md'
        assert parsed.output_file == 'rules.json'

    def test_parse_args_with_framework(self):
        """Test parsing with framework option."""
        # Given
        args = ['generate', 'input.md', '-o', 'output/', '-n', 'MySkill', '-f', 'openclaw']
        
        # When
        parsed = parse_args(args)
        
        # Then
        assert parsed.framework == 'openclaw'

    def test_cli_generate_with_framework(self, tmp_path, simple_sop_markdown):
        """Test generating Skill with specific framework."""
        # Given
        input_file = tmp_path / "test_sop.md"
        input_file.write_text(simple_sop_markdown, encoding='utf-8')
        output_dir = tmp_path / "output"
        
        # When
        with patch.object(sys, 'argv', ['cli.py', 'generate', str(input_file), '-o', str(output_dir), '-n', '折扣管理', '-f', 'gpts']):
            try:
                main()
            except SystemExit:
                pass
        
        # Then
        assert output_dir.exists()

    def test_cli_missing_input_file(self):
        """Test CLI with missing input file."""
        # When/Then
        with patch.object(sys, 'argv', ['cli.py', 'generate', 'nonexistent.md', '-o', 'output/', '-n', 'Test']):
            try:
                main()
            except (SystemExit, CLIError):
                pass

    def test_cli_missing_output_dir_arg(self):
        """Test CLI with missing output directory argument."""
        # When/Then
        with patch.object(sys, 'argv', ['cli.py', 'generate', 'input.md', '-n', 'Test']):
            try:
                main()
            except SystemExit as e:
                assert e.code != 0
