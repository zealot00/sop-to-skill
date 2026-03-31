"""SKILL.md generator - converts ExtractedRules to SKILL.md format."""
from dataclasses import dataclass
from typing import Optional

from scripts.models import ExtractedRules


@dataclass
class SKILLMDContent:
    """SKILL.md content container."""
    frontmatter: str
    body: str


def generate_skill_md(
    rules: ExtractedRules,
    skill_name: str,
    description: str
) -> SKILLMDContent:
    """
    Generate SKILL.md content from extracted rules.

    Args:
        rules: Extracted rules from SOP document.
        skill_name: Name of the skill.
        description: Description of the skill.

    Returns:
        SKILLMDContent containing frontmatter and body.
    """
    # Build frontmatter (standard YAML frontmatter: opening --- + YAML + closing ---)
    # The frontmatter string is what yaml.safe_load can parse directly
    frontmatter_lines = [
        "---",
        f"name: {skill_name}",
        f"description: {description}",
        "---",
        "",  # blank line separator after frontmatter
    ]
    frontmatter = "\n".join(frontmatter_lines)

    # Build body
    body_parts = []

    # When to Use section
    body_parts.append("# When to Use\n")
    if rules.constraints:
        body_parts.append("Use this skill when the following conditions are met:\n")
        for c in rules.constraints:
            if c.condition:
                body_parts.append(f"- {c.condition}\n")
            else:
                body_parts.append(f"- {c.description}\n")
    else:
        body_parts.append("Use this skill when needed.\n")

    # Roles section
    if rules.roles:
        body_parts.append("\n## Roles\n")
        for role_id, role_info in rules.roles.items():
            role_name = role_info.get("name", role_id)
            role_desc = role_info.get("description", "")
            body_parts.append(f"- **{role_name}** ({role_id}): {role_desc}\n")

    # Constraints section
    if rules.constraints:
        body_parts.append("\n## Constraints\n")
        for c in rules.constraints:
            level_tag = c.level.value.upper()
            body_parts.append(f"- **{level_tag}**: {c.description}")
            if c.condition:
                body_parts.append(f" (condition: {c.condition})")
            body_parts.append("\n")

    # Decision Tables section
    if rules.decisions:
        body_parts.append("\n## Decision Rules\n")
        for dt in rules.decisions:
            body_parts.append(f"### {dt.name}\n")
            body_parts.append(f"- Input: {', '.join(dt.input_vars)}\n")
            body_parts.append(f"- Output: {', '.join(dt.output_vars)}\n")
            for rule in dt.rules:
                when_str = ", ".join(f"{k}={v}" for k, v in rule.when.items())
                then_str = ", ".join(f"{k}={v}" for k, v in rule.then.items())
                body_parts.append(f"  - When {when_str} → Then {then_str}\n")

    # Parameters section
    if rules.boundaries:
        body_parts.append("\n## Parameters\n")
        for bp_id, bp in rules.boundaries.items():
            body_parts.append(f"- **{bp.name}**: {bp.min_value}~{bp.max_value} {bp.unit}")
            if bp.default_value is not None:
                body_parts.append(f" (default: {bp.default_value})")
            body_parts.append("\n")

    # Subjective judgments section
    if rules.subjective_judgments:
        body_parts.append("\n## Subjective Judgments\n")
        for sj in rules.subjective_judgments:
            body_parts.append(f"- {sj.description}")
            if sj.recommendation:
                body_parts.append(f" → {sj.recommendation}")
            body_parts.append("\n")

    # Ambiguity notes section
    if rules.ambiguity_notes:
        body_parts.append("\n## Ambiguity Notes\n")
        for an in rules.ambiguity_notes:
            body_parts.append(f"- **{an.text}**: {an.suggestion}\n")

    body = "---\n\n" + "".join(body_parts)
    return SKILLMDContent(frontmatter=frontmatter, body=body)
