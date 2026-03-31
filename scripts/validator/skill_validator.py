"""Skill validator - validates generated Skill packages."""
from dataclasses import dataclass, field
from pathlib import Path
from typing import List

import yaml

from scripts.models import ValidationReport, ValidationIssue


@dataclass
class ValidationResult:
    """Result of skill validation."""
    passed: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    info: List[str] = field(default_factory=list)

    @classmethod
    def from_validation_report(cls, report: ValidationReport) -> "ValidationResult":
        """Convert ValidationReport to ValidationResult."""
        errors = [issue.message for issue in report.issues if issue.severity == "error"]
        warnings = [issue.message for issue in report.issues if issue.severity == "warning"]
        info = [issue.message for issue in report.issues if issue.severity == "info"]
        return cls(
            passed=report.passed,
            errors=errors,
            warnings=warnings,
            info=info
        )


REQUIRED_FILES = ["SKILL.md"]
OPTIONAL_FILES = ["constraints.yaml", "decision_table.yaml", "parameters.json", "sources.md"]


def _parse_frontmatter(content: str) -> dict | None:
    """Parse YAML frontmatter from markdown content."""
    if not content.startswith("---"):
        return None
    parts = content.split("---", 2)
    if len(parts) < 3:
        return None
    try:
        return yaml.safe_load(parts[1])
    except yaml.YAMLError:
        return None


def validate_skill_directory(path: str | Path) -> ValidationResult:
    """
    Validate a skill directory for completeness and correctness.

    Args:
        path: Path to the skill directory.

    Returns:
        ValidationResult with pass/fail status and error messages.
    """
    path = Path(path)
    errors: List[str] = []
    warnings: List[str] = []

    # Check required files exist
    for req_file in REQUIRED_FILES:
        file_path = path / req_file
        if not file_path.exists():
            errors.append(f"Missing required file: {req_file}")
            return ValidationResult(passed=False, errors=errors)

    # Validate SKILL.md
    skill_md_path = path / "SKILL.md"
    try:
        skill_md_content = skill_md_path.read_text(encoding="utf-8")
    except Exception as e:
        errors.append(f"Cannot read SKILL.md: {e}")
        return ValidationResult(passed=False, errors=errors)

    # Parse frontmatter
    fm = _parse_frontmatter(skill_md_content)
    if fm is None:
        errors.append("SKILL.md is missing or invalid frontmatter (must start with '---')")
        return ValidationResult(passed=False, errors=errors)

    # Check required frontmatter fields
    if "name" not in fm:
        errors.append("SKILL.md frontmatter is missing required field: name")
    if "description" not in fm:
        errors.append("SKILL.md frontmatter is missing required field: description")

    if errors:
        return ValidationResult(passed=False, errors=errors)

    # Validate optional files if they exist
    for opt_file in OPTIONAL_FILES:
        opt_path = path / opt_file
        if opt_path.exists():
            try:
                if opt_file.endswith(".yaml") or opt_file.endswith(".yml"):
                    yaml.safe_load(opt_path.read_text(encoding="utf-8"))
                elif opt_file.endswith(".json"):
                    import json
                    json.loads(opt_path.read_text(encoding="utf-8"))
            except Exception as e:
                warnings.append(f"{opt_file} exists but is invalid: {e}")

    return ValidationResult(passed=True, warnings=warnings)
