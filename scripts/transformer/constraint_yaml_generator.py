"""constraints.yaml generator - converts constraints to YAML format."""
from typing import List, Dict, Any

import yaml

from scripts.models import ExtractedRules


def generate_constraints_yaml(rules: ExtractedRules) -> str:
    """
    Generate constraints.yaml content from extracted rules.

    Args:
        rules: Extracted rules containing constraints.

    Returns:
        YAML string representing constraints.
    """
    constraint_list: List[Dict[str, Any]] = []

    for c in rules.constraints:
        entry: Dict[str, Any] = {
            "id": c.id,
            "level": c.level.value,
            "description": c.description,
        }
        if c.condition:
            entry["condition"] = c.condition
        if c.action:
            entry["action"] = c.action
        if c.roles:
            entry["roles"] = c.roles
        if c.needs_human_judgment:
            entry["needs_human_judgment"] = True
        if c.confidence != 0.9:
            entry["confidence"] = c.confidence
        if c.source_quote:
            entry["source_quote"] = c.source_quote

        constraint_list.append(entry)

    doc = {"constraints": constraint_list}
    return yaml.dump(doc, allow_unicode=True, default_flow_style=False, sort_keys=False)
