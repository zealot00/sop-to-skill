"""Skill transformer - integrates all generators to produce a complete Skill package."""
from typing import Optional

from scripts.models import ExtractedRules, SkillPackage

from scripts.transformer.skill_md_generator import generate_skill_md
from scripts.transformer.constraint_yaml_generator import generate_constraints_yaml
from scripts.transformer.decision_yaml_generator import generate_decision_table_yaml
from scripts.transformer.parameters_generator import generate_parameters_json
from scripts.transformer.sources_generator import generate_sources_md


def transform_to_skill(
    rules: ExtractedRules,
    skill_name: str,
    description: str,
    include_constraints: bool = True,
    include_decisions: bool = True,
    include_parameters: bool = True,
    include_sources: bool = True,
) -> SkillPackage:
    """
    Transform extracted rules into a complete Skill package.

    Args:
        rules: Extracted rules from SOP document.
        skill_name: Name of the skill.
        description: Description of the skill.
        include_constraints: Whether to include constraints.yaml.
        include_decisions: Whether to include decision_table.yaml.
        include_parameters: Whether to include parameters.json.
        include_sources: Whether to include sources.md.

    Returns:
        SkillPackage containing all generated files.
    """
    files: dict[str, str] = {}

    # Generate SKILL.md
    skill_md_content = generate_skill_md(
        rules=rules,
        skill_name=skill_name,
        description=description
    )
    files["SKILL.md"] = skill_md_content.frontmatter + skill_md_content.body

    # Generate constraints.yaml
    if include_constraints:
        files["constraints.yaml"] = generate_constraints_yaml(rules)

    # Generate decision_table.yaml
    if include_decisions and rules.decisions:
        files["decision_table.yaml"] = generate_decision_table_yaml(rules)

    # Generate parameters.json
    if include_parameters and rules.boundaries:
        files["parameters.json"] = generate_parameters_json(rules)

    # Generate sources.md
    if include_sources:
        files["sources.md"] = generate_sources_md(rules)

    return SkillPackage(files=files, metadata={
        "skill_name": skill_name,
        "description": description,
        "num_constraints": len(rules.constraints),
        "num_decisions": len(rules.decisions),
        "num_parameters": len(rules.boundaries),
    })
