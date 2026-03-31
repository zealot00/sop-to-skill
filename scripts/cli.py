#!/usr/bin/env python3
"""CLI tool for SOP to Skill conversion.

Usage:
    python3 scripts/cli.py generate <input_file> -o <output_dir> -n <skill_name>
    python3 scripts/cli.py validate <skill_dir>
    python3 scripts/cli.py extract <input_file> -o <output.json>
"""
import argparse
import sys
import json
from pathlib import Path
from typing import Optional, Dict, Any

# Import generators
from scripts.generators.openclaw_generator import OpenClawGenerator
from scripts.generators.gpts_generator import GPTsGenerator
from scripts.generators.mcp_schema_generator import MCPSchemaGenerator
from scripts.generators.claude_tools_generator import ClaudeToolsGenerator
from scripts.generators.langchain_generator import LangChainGenerator

# Import models
from scripts.models import (
    ExtractedRules, Constraint, ConstraintLevel, ConstraintType,
    DecisionTable, DecisionRule, BoundaryParameter, ValidationReport,
    ValidationIssue, SkillPackage
)

# Import extractor
from scripts.extractor.rule_extractor import RuleExtractor


class CLIError(Exception):
    """CLI-specific error."""
    pass


def parse_args(args: list) -> argparse.Namespace:
    """Parse command line arguments.

    Args:
        args: Command line arguments.

    Returns:
        Parsed arguments namespace.
    """
    parser = argparse.ArgumentParser(
        description="SOP to Skill Converter - Generate Skills from SOP documents",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 scripts/cli.py generate input.md -o ./output -n "MySkill"
  python3 scripts/cli.py generate input.md -o ./output -n "MySkill" -f gpts
  python3 scripts/cli.py validate ./my-skill/
  python3 scripts/cli.py extract input.md -o rules.json
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # Generate command
    generate_parser = subparsers.add_parser("generate", help="Generate Skill from SOP")
    generate_parser.add_argument("input_file", help="Input SOP file (md, docx, pdf)")
    generate_parser.add_argument("-o", "--output-dir", required=True, help="Output directory")
    generate_parser.add_argument("-n", "--skill-name", required=True, help="Skill name")
    generate_parser.add_argument("-f", "--framework", default="openclaw",
                                  choices=["openclaw", "gpts", "mcp", "claude", "langchain", "all"],
                                  help="Output framework (default: openclaw)")

    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate Skill structure")
    validate_parser.add_argument("skill_dir", help="Skill directory to validate")

    # Extract command
    extract_parser = subparsers.add_parser("extract", help="Extract rules to JSON")
    extract_parser.add_argument("input_file", help="Input SOP file")
    extract_parser.add_argument("-o", "--output-file", required=True, help="Output JSON file")

    if not args:
        parser.print_help()
        sys.exit(1)

    return parser.parse_args(args)


def parse_input_file(file_path: str) -> ExtractedRules:
    """Parse input file and extract rules.

    Args:
        file_path: Path to input file.

    Returns:
        Extracted rules.
    """
    path = Path(file_path)

    if not path.exists():
        raise CLIError(f"Input file not found: {file_path}")

    # Get file extension
    suffix = path.suffix.lower()

    # Simple markdown parser for now
    if suffix == '.md':
        return parse_markdown(path)
    else:
        # For other formats, return empty rules (would need additional libraries)
        raise CLIError(f"Unsupported file format: {suffix}. Only .md is currently supported.")


def parse_markdown(path: Path) -> ExtractedRules:
    """Parse markdown SOP file using RuleExtractor.

    Args:
        path: Path to markdown file.

    Returns:
        Extracted rules.
    """
    content = path.read_text(encoding='utf-8')

    # Use RuleExtractor for proper constraint/decision/role extraction
    extractor = RuleExtractor()
    extracted = extractor.extract(content)

    # Re-number constraint IDs sequentially
    for i, c in enumerate(extracted.constraints, 1):
        c.id = f"C{i:03d}"

    return extracted


def extract_roles(text: str) -> list:
    """Extract roles from text.

    Args:
        text: Text to parse.

    Returns:
        List of roles.
    """
    roles = []
    role_keywords = ['主管', '经理', '总监', '总经理', '销售员', '系统', '审批人', '操作员']
    for role in role_keywords:
        if role in text:
            roles.append(role)
    return roles


def parse_decision_rule(line: str) -> Optional[DecisionRule]:
    """Parse a decision rule from text.

    Args:
        line: Text line containing rule.

    Returns:
        DecisionRule if found, None otherwise.
    """
    try:
        # Look for pattern like "当 X=Y → 则 A=B" or "X=Y → A=B"
        if '当' in line and '则' in line:
            when_part = line.split('则')[0].replace('当', '').strip()
            then_part = line.split('则')[1].strip()
        elif '→' in line:
            parts = line.split('→')
            when_part = parts[0].replace('当', '').strip()
            then_part = parts[1].replace('则', '').strip()
        else:
            return None

        when = {}
        for item in when_part.split(','):
            if '=' in item:
                key, value = item.split('=', 1)
                when[key.strip()] = value.strip()

        then = {}
        for item in then_part.split(','):
            if '=' in item:
                key, value = item.split('=', 1)
                then[key.strip()] = value.strip()

        if when and then:
            return DecisionRule(when=when, then=then)

    except Exception:
        pass

    return None


def parse_boundary(line: str) -> Optional[BoundaryParameter]:
    """Parse boundary parameter from text.

    Args:
        line: Text line containing boundary.

    Returns:
        BoundaryParameter if found, None otherwise.
    """
    try:
        name = ""
        max_val = None
        min_val = None

        if '上限' in line:
            name = line.split('上限')[0].replace('#', '').strip()
            import re
            nums = re.findall(r'\d+', line)
            if nums:
                max_val = float(nums[0])
        elif '最大值' in line:
            name = line.split('最大值')[0].replace('#', '').strip()
            import re
            nums = re.findall(r'\d+', line)
            if nums:
                max_val = float(nums[0])

        if name and (max_val is not None or min_val is not None):
            return BoundaryParameter(name=name, max_value=max_val, min_value=min_val)

    except Exception:
        pass

    return None


def validate_skill(skill_dir: str) -> ValidationReport:
    """Validate skill directory structure.

    Args:
        skill_dir: Path to skill directory.

    Returns:
        Validation report.
    """
    path = Path(skill_dir)

    if not path.exists():
        return ValidationReport(
            passed=False,
            score=0.0,
            issues=[ValidationIssue(
                type="missing_directory",
                severity="error",
                message=f"Skill directory not found: {skill_dir}"
            )]
        )

    issues = []

    # Check for SKILL.md or similar
    has_skill_file = any(f.name.lower() in ['skill.md', 'readme.md', 'readme.txt']
                         for f in path.glob('*'))

    if not has_skill_file:
        issues.append(ValidationIssue(
            type="missing_skill_file",
            severity="error",
            message="SKILL.md or README.md not found"
        ))

    score = 1.0 if has_skill_file else 0.0

    return ValidationReport(
        passed=len([i for i in issues if i.severity == 'error']) == 0,
        score=score,
        issues=issues
    )


def generate_skill(rules: ExtractedRules, skill_name: str, framework: str) -> SkillPackage:
    """Generate skill package.

    Args:
        rules: Extracted rules.
        skill_name: Name of skill.
        framework: Target framework.

    Returns:
        Skill package.
    """
    files = {}

    if framework in ['openclaw', 'all']:
        generator = OpenClawGenerator()
        files['SKILL.md'] = generator.generate(rules, skill_name)

    if framework in ['gpts', 'all']:
        generator = GPTsGenerator()
        gpts_output = generator.generate(rules, skill_name)
        files['gpts_instructions.md'] = gpts_output['instructions']
        files['gpts_actions.json'] = json.dumps(gpts_output['actions'], indent=2, ensure_ascii=False)

    if framework in ['mcp', 'all']:
        generator = MCPSchemaGenerator()
        mcp_schema = generator.generate(rules, skill_name)
        files['mcp_tools.json'] = json.dumps(mcp_schema, indent=2, ensure_ascii=False)

    if framework in ['claude', 'all']:
        generator = ClaudeToolsGenerator()
        claude_tools = generator.generate(rules, skill_name)
        files['claude_tools.json'] = json.dumps(claude_tools, indent=2, ensure_ascii=False)

    if framework in ['langchain', 'all']:
        generator = LangChainGenerator()
        langchain_output = generator.generate(rules, skill_name)
        files['langchain_tools.json'] = json.dumps(langchain_output, indent=2, ensure_ascii=False)
        files['langchain_models.py'] = generator.generate_pydantic_models(rules)

    return SkillPackage(
        files=files,
        metadata={
            'skill_name': skill_name,
            'framework': framework,
            'constraint_count': len(rules.constraints),
            'decision_count': len(rules.decisions)
        }
    )


def main():
    """Main CLI entry point."""
    args = parse_args(sys.argv[1:])

    try:
        if args.command == 'generate':
            # Parse input file
            print(f"Parsing {args.input_file}...")
            rules = parse_input_file(args.input_file)
            print(f"Extracted {len(rules.constraints)} constraints, {len(rules.decisions)} decisions")

            # Generate skill
            print(f"Generating skill '{args.skill_name}' for framework '{args.framework}'...")
            skill_package = generate_skill(rules, args.skill_name, args.framework)

            # Write to output directory
            print(f"Writing to {args.output_dir}...")
            skill_package.write_to_directory(args.output_dir)

            print(f"Successfully generated skill with {len(skill_package.files)} files")

        elif args.command == 'validate':
            print(f"Validating skill at {args.skill_dir}...")
            report = validate_skill(args.skill_dir)

            if report.passed:
                print(f"✓ Validation passed (score: {report.score:.0%})")
                sys.exit(0)
            else:
                print(f"✗ Validation failed (score: {report.score:.0%})")
                for issue in report.issues:
                    print(f"  [{issue.severity.upper()}] {issue.message}")
                sys.exit(1)

        elif args.command == 'extract':
            print(f"Extracting rules from {args.input_file}...")
            rules = parse_input_file(args.input_file)

            # Convert to dict for JSON serialization
            rules_dict = {
                'constraints': [
                    {
                        'id': c.id,
                        'level': c.level.value,
                        'description': c.description,
                        'condition': c.condition,
                        'action': c.action,
                        'roles': c.roles
                    }
                    for c in rules.constraints
                ],
                'decisions': [
                    {
                        'id': d.id,
                        'name': d.name,
                        'input_vars': d.input_vars,
                        'output_vars': d.output_vars,
                        'rules': [
                            {'when': r.when, 'then': r.then}
                            for r in d.rules
                        ]
                    }
                    for d in rules.decisions
                ],
                'boundaries': {
                    name: {
                        'name': param.name,
                        'min_value': param.min_value,
                        'max_value': param.max_value,
                        'default_value': param.default_value,
                        'unit': param.unit
                    }
                    for name, param in rules.boundaries.items()
                }
            }

            # Write to output file
            output_path = Path(args.output_file)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(json.dumps(rules_dict, indent=2, ensure_ascii=False), encoding='utf-8')

            print(f"Successfully extracted rules to {args.output_file}")

        else:
            print(f"Unknown command: {args.command}")
            sys.exit(1)

    except CLIError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
