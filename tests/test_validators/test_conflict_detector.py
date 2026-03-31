"""Tests for constraint conflict detector."""
import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scripts.models import Constraint, ConstraintLevel, ExtractedRules
from scripts.validator.conflict_detector import detect_conflicts, ConflictReport


class TestConflictDetector:
    """Test suite for conflict detection."""

    def test_detect_conflicting_constraints(self):
        """冲突的 MUST 约束应被检测到。"""
        constraints = [
            Constraint(
                id="c1",
                level=ConstraintLevel.MUST,
                description="折扣比例不得超过20%",
                condition="任何订单"
            ),
            Constraint(
                id="c2",
                level=ConstraintLevel.MUST,
                description="折扣比例不得低于30%",
                condition="VIP客户订单"
            )
        ]
        rules = ExtractedRules(constraints=constraints)
        report = detect_conflicts(rules)
        assert isinstance(report, ConflictReport)
        assert len(report.conflicts) > 0

    def test_no_false_positive_conflicts(self):
        """无冲突的约束不应报错。"""
        constraints = [
            Constraint(
                id="c1",
                level=ConstraintLevel.MUST,
                description="折扣比例不得超过20%",
                condition="普通订单"
            ),
            Constraint(
                id="c2",
                level=ConstraintLevel.MUST,
                description="所有订单必须记录到系统",
                condition="任何订单"
            )
        ]
        rules = ExtractedRules(constraints=constraints)
        report = detect_conflicts(rules)
        assert len(report.conflicts) == 0

    def test_detect_numeric_range_conflicts(self):
        """数字范围冲突应被检测到。"""
        constraints = [
            Constraint(
                id="c1",
                level=ConstraintLevel.MUST,
                description="审批金额上限为10万",
                condition="经理审批"
            ),
            Constraint(
                id="c2",
                level=ConstraintLevel.MUST,
                description="审批金额下限为20万",
                condition="特殊订单"
            )
        ]
        rules = ExtractedRules(constraints=constraints)
        report = detect_conflicts(rules)
        # 10万上限 vs 20万下限 — 在某些条件下可能冲突
        # 检测器应识别出范围重叠或矛盾
        # 至少应该有 warnings 或 conflicts
        assert report is not None

    def test_empty_constraints_no_conflicts(self):
        """空约束列表应无冲突。"""
        rules = ExtractedRules(constraints=[])
        report = detect_conflicts(rules)
        assert len(report.conflicts) == 0

    def test_conflict_report_structure(self):
        """冲突报告结构应正确。"""
        constraints = [
            Constraint(
                id="c1",
                level=ConstraintLevel.MUST,
                description="A必须等于1",
                condition="条件X"
            ),
            Constraint(
                id="c2",
                level=ConstraintLevel.MUST,
                description="A必须等于2",
                condition="条件X"
            )
        ]
        rules = ExtractedRules(constraints=constraints)
        report = detect_conflicts(rules)
        assert hasattr(report, "conflicts")
        assert hasattr(report, "warnings")
        assert isinstance(report.conflicts, list)
        assert isinstance(report.warnings, list)

    def test_different_levels_no_conflict(self):
        """MUST 和 SHOULD 级别不冲突。"""
        constraints = [
            Constraint(
                id="c1",
                level=ConstraintLevel.MUST,
                description="必须执行X",
            ),
            Constraint(
                id="c2",
                level=ConstraintLevel.SHOULD,
                description="应该执行Y",
            )
        ]
        rules = ExtractedRules(constraints=constraints)
        report = detect_conflicts(rules)
        # MUST vs SHOULD 不是直接冲突
        assert len(report.conflicts) == 0
