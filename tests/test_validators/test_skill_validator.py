"""Tests for Skill validator."""
import pytest
import sys
import tempfile
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scripts.validator.skill_validator import validate_skill_directory, ValidationResult


class TestSkillValidator:
    """Test suite for Skill validation."""

    def test_validate_missing_required_files(self):
        """缺少必需文件应报错。"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # 只创建一个空目录，不放任何文件
            result = validate_skill_directory(tmpdir)
            assert isinstance(result, ValidationResult)
            assert result.passed is False
            assert len(result.errors) > 0

    def test_validate_missing_skill_md(self):
        """缺少 SKILL.md 应报错。"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # 创建其他文件，但不创建 SKILL.md
            Path(tmpdir, "README.md").write_text("# Test")
            result = validate_skill_directory(tmpdir)
            assert result.passed is False
            assert any("SKILL.md" in e or "skill" in e.lower() for e in result.errors)

    def test_validate_complete_skill(self):
        """完整的 Skill 应通过验证。"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # 创建完整的 SKILL.md
            skill_md = """---
name: test-skill
description: Test skill description
---

# Test Skill

## When to Use

Use this when testing.

## Constraints

- MUST: Do this
"""
            Path(tmpdir, "SKILL.md").write_text(skill_md)
            result = validate_skill_directory(tmpdir)
            assert result.passed is True

    def test_validate_skill_md_frontmatter(self):
        """SKILL.md 必须包含有效的 frontmatter。"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # 没有 frontmatter 的 SKILL.md
            Path(tmpdir, "SKILL.md").write_text("# Just a title\n\nNo frontmatter")
            result = validate_skill_directory(tmpdir)
            # 应该失败，因为缺少 name 和 description
            assert result.passed is False

    def test_validate_skill_md_missing_name(self):
        """SKILL.md frontmatter 缺少 name 应报错。"""
        with tempfile.TemporaryDirectory() as tmpdir:
            skill_md = """---
description: Only description, no name
---

# Test
"""
            Path(tmpdir, "SKILL.md").write_text(skill_md)
            result = validate_skill_directory(tmpdir)
            assert result.passed is False
            assert any("name" in e.lower() for e in result.errors)

    def test_validate_skill_md_missing_description(self):
        """SKILL.md frontmatter 缺少 description 应报错。"""
        with tempfile.TemporaryDirectory() as tmpdir:
            skill_md = """---
name: my-skill
---

# My Skill
"""
            Path(tmpdir, "SKILL.md").write_text(skill_md)
            result = validate_skill_directory(tmpdir)
            assert result.passed is False
            assert any("description" in e.lower() for e in result.errors)

    def test_validate_with_constraints_yaml(self):
        """有 constraints.yaml 的 Skill 应正常验证。"""
        with tempfile.TemporaryDirectory() as tmpdir:
            skill_md = """---
name: test-skill
description: Test skill
---

# Test
"""
            constraints_yaml = """constraints:
  - id: c1
    level: must
    description: Test constraint
"""
            Path(tmpdir, "SKILL.md").write_text(skill_md)
            Path(tmpdir, "constraints.yaml").write_text(constraints_yaml)
            result = validate_skill_directory(tmpdir)
            assert result.passed is True
