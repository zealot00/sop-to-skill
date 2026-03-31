"""Conflict detector - detects conflicting constraints in extracted rules."""
import re
from dataclasses import dataclass, field
from typing import List, Tuple

from scripts.models import ExtractedRules, Constraint, ConstraintLevel


@dataclass
class Conflict:
    """Represents a conflict between constraints."""
    constraint_ids: Tuple[str, str]
    conflict_type: str
    description: str


@dataclass
class ConflictReport:
    """Report of detected conflicts."""
    conflicts: List[Conflict] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


def _extract_numeric_value(text: str) -> float | None:
    """Extract numeric value from text like '10万', '50%', '1000000元'."""
    patterns = [
        r"(\d+(?:\.\d+)?)\s*万",
        r"(\d+(?:\.\d+)?)\s*%",
        r"(\d+(?:\.\d+)?)\s*元",
        r"(\d+(?:\.\d+)?)",
    ]
    for pattern in patterns:
        m = re.search(pattern, text)
        if m:
            value = float(m.group(1))
            if "万" in pattern and "%" not in pattern:
                value *= 10000
            return value
    return None


def _has_condition_overlap(c1: Constraint, c2: Constraint) -> bool:
    """Check if two constraints have overlapping conditions."""
    if not c1.condition or not c2.condition:
        return False
    cond1 = c1.condition.lower()
    cond2 = c2.condition.lower()
    # Simple check: if both mention similar keywords
    shared_words = set(cond1.split()) & set(cond2.split())
    # Filter out common stop words
    stop_words = {"当", "任何", "在", "的", "时", "and", "or", "the", "a", "an", "when", "if"}
    meaningful_shared = shared_words - stop_words
    return len(meaningful_shared) >= 1


def detect_conflicts(rules: ExtractedRules) -> ConflictReport:
    """
    Detect conflicts between constraints in the extracted rules.

    Args:
        rules: Extracted rules to check for conflicts.

    Returns:
        ConflictReport containing detected conflicts and warnings.
    """
    report = ConflictReport()
    constraints = rules.constraints

    # Check pairs of MUST constraints for conflicts
    for i, c1 in enumerate(constraints):
        if c1.level != ConstraintLevel.MUST:
            continue
        for c2 in constraints[i + 1:]:
            if c2.level != ConstraintLevel.MUST:
                continue

            # Check if descriptions suggest contradictory requirements
            conflict_desc = _check_contradiction(c1, c2)
            if conflict_desc:
                report.conflicts.append(Conflict(
                    constraint_ids=(c1.id, c2.id),
                    conflict_type="contradictory_requirements",
                    description=conflict_desc
                ))
                continue

            # Check numeric range conflicts
            range_conflict = _check_numeric_conflict(c1, c2)
            if range_conflict:
                report.conflicts.append(Conflict(
                    constraint_ids=(c1.id, c2.id),
                    conflict_type="numeric_range_conflict",
                    description=range_conflict
                ))

    return report


def _check_contradiction(c1: Constraint, c2: Constraint) -> str | None:
    """Check if two constraints are contradictory."""
    desc1 = c1.description.lower()
    desc2 = c2.description.lower()

    # Detect opposite operators
    opposites = [
        (("不得超过", "不得低于"), "opposite_bounds"),
        (("必须等于", "必须等于"), "equal_conflict"),
        (("应当", "不得"), "should_vs_must_not"),
    ]

    #不得 vs 不得 - both forbidding but different things is not a conflict
    # Check "不得超过" vs "不得低于"
    val1 = _extract_numeric_value(desc1)
    val2 = _extract_numeric_value(desc2)
    if val1 is not None and val2 is not None:
        if "不得超过" in desc1 and "不得低于" in desc2:
            if val1 < val2:
                return f"'上限={val1}' vs '下限={val2}' creates impossible range"
        if "不得超过" in desc2 and "不得低于" in desc1:
            if val2 < val1:
                return f"'上限={val2}' vs '下限={val1}' creates impossible range"

    return None


def _check_numeric_conflict(c1: Constraint, c2: Constraint) -> str | None:
    """Check for numeric range conflicts between constraints."""
    if not _has_condition_overlap(c1, c2):
        return None

    val1 = _extract_numeric_value(c1.description)
    val2 = _extract_numeric_value(c2.description)

    if val1 is not None and val2 is not None:
        # Check if both set bounds on the same parameter
        if "上限" in c1.description or "上限" in c2.description:
            if "下限" in c1.description or "下限" in c2.description:
                return f"Conflicting numeric bounds on overlapping conditions"

    return None
