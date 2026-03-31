"""decision_table.yaml generator - converts decision tables to YAML format."""
from typing import List, Dict, Any

import yaml

from scripts.models import ExtractedRules


def generate_decision_table_yaml(rules: ExtractedRules) -> str:
    """
    Generate decision_table.yaml content from extracted rules.

    Args:
        rules: Extracted rules containing decision tables.

    Returns:
        YAML string representing decision tables.
    """
    table_list: List[Dict[str, Any]] = []

    for dt in rules.decisions:
        rule_list: List[Dict[str, Any]] = []
        for rule in dt.rules:
            rule_list.append({
                "when": rule.when,
                "then": rule.then,
            })

        entry: Dict[str, Any] = {
            "id": dt.id,
            "name": dt.name,
            "input_vars": dt.input_vars,
            "output_vars": dt.output_vars,
            "rules": rule_list,
        }
        table_list.append(entry)

    doc = {"decision_tables": table_list}
    return yaml.dump(doc, allow_unicode=True, default_flow_style=False, sort_keys=False)
