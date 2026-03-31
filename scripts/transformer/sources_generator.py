"""sources.md generator - documents source quotes and references."""
from scripts.models import ExtractedRules


def generate_sources_md(rules: ExtractedRules) -> str:
    """
    Generate sources.md content from extracted rules.

    Args:
        rules: Extracted rules containing source quotes.

    Returns:
        Markdown string representing sources and references.
    """
    lines: list[str] = ["# Sources & References\n"]

    # Source quotes from constraints
    quoted_constraints = [c for c in rules.constraints if c.source_quote]
    if quoted_constraints:
        lines.append("## Source Quotes\n")
        for c in quoted_constraints:
            lines.append(f"### {c.id}: {c.description}\n")
            lines.append(f"> {c.source_quote}\n")

    # Ambiguity notes
    if rules.ambiguity_notes:
        lines.append("## Ambiguity Notes\n")
        for an in rules.ambiguity_notes:
            lines.append(f"### {an.text}\n")
            lines.append(f"- **Reason**: {an.reason}\n")
            lines.append(f"- **Suggestion**: {an.suggestion}\n")

    # Subjective judgment items
    if rules.subjective_judgments:
        lines.append("## Subjective Judgment Items\n")
        for sj in rules.subjective_judgments:
            lines.append(f"- **{sj.description}**\n")
            if sj.markers:
                lines.append(f"  - Markers: {', '.join(sj.markers)}\n")
            if sj.recommendation:
                lines.append(f"  - Recommendation: {sj.recommendation}\n")

    if not quoted_constraints and not rules.ambiguity_notes and not rules.subjective_judgments:
        lines.append("No source references available.\n")

    return "".join(lines)
