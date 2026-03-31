"""parameters.json generator - converts boundary parameters to JSON format."""
import json
from typing import Dict, Any, List

from scripts.models import ExtractedRules


def _serialize_value(value: Any) -> Any:
    """Serialize a value to JSON-compatible type."""
    if value is None:
        return None
    if hasattr(value, "__float__"):
        return float(value)
    if hasattr(value, "__int__"):
        return int(value)
    return value


def generate_parameters_json(rules: ExtractedRules) -> str:
    """
    Generate parameters.json content from extracted rules.

    Args:
        rules: Extracted rules containing boundary parameters.

    Returns:
        JSON string representing parameters.
    """
    param_list: List[Dict[str, Any]] = []

    for bp_id, bp in rules.boundaries.items():
        entry: Dict[str, Any] = {
            "id": bp_id,
            "name": bp.name,
            "min_value": _serialize_value(bp.min_value),
            "max_value": _serialize_value(bp.max_value),
            "unit": bp.unit,
        }
        if bp.default_value is not None:
            entry["default_value"] = _serialize_value(bp.default_value)

        param_list.append(entry)

    doc = {"parameters": param_list}
    return json.dumps(doc, ensure_ascii=False, indent=2)
