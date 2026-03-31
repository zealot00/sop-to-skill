"""Tests for OpenClaw SKILL.md generator."""
import pytest
from scripts.models import (
    ExtractedRules, Constraint, ConstraintLevel, ConstraintType,
    DecisionTable, DecisionRule, BoundaryParameter
)
from scripts.generators.openclaw_generator import OpenClawGenerator


class TestOpenClawGenerator:
    """Test suite for OpenClawGenerator."""

    def test_generate_openclaw_skill_structure(self, simple_sop_markdown):
        """Test generating OpenClaw format Skill with full structure."""
        # Given
        generator = OpenClawGenerator()
        rules = self._create_mock_rules()
        
        # When
        skill_md = generator.generate(rules, skill_name="折扣权限管理")
        
        # Then
        assert skill_md is not None
        # Should start with skill name as header
        assert skill_md.startswith("# 折扣权限管理")
        assert "description" in skill_md or "Meta-Skill" in skill_md
        assert "## When to Use" in skill_md or "## Triggers" in skill_md or "## Steps" in skill_md
        assert "## Actions" in skill_md or "## Steps" in skill_md or "Constraints" in skill_md
        assert len(skill_md) > 100  # Should have substantial content

    def test_generate_with_constraints(self):
        """Test generating skill with constraint rules."""
        # Given
        generator = OpenClawGenerator()
        rules = self._create_rules_with_constraints()
        
        # When
        skill_md = generator.generate(rules, skill_name="折扣管理")
        
        # Then
        assert "约束" in skill_md or "constraint" in skill_md.lower()
        assert "MUST" in skill_md or "must" in skill_md.lower()
        assert "SHOULD" in skill_md or "should" in skill_md.lower()

    def test_generate_with_decision_tables(self):
        """Test generating skill with decision tables."""
        # Given
        generator = OpenClawGenerator()
        rules = self._create_rules_with_decisions()
        
        # When
        skill_md = generator.generate(rules, skill_name="审批流程")
        
        # Then
        assert "决策" in skill_md or "decision" in skill_md.lower()
        assert "规则" in skill_md or "rule" in skill_md.lower()

    def test_generate_triggers_section(self):
        """Test that triggers section is generated."""
        # Given
        generator = OpenClawGenerator()
        rules = self._create_mock_rules()
        
        # When
        skill_md = generator.generate(rules, skill_name="测试技能")
        
        # Then
        assert "触发" in skill_md or "trigger" in skill_md.lower()

    def test_generate_workflow_steps(self):
        """Test that workflow steps are generated."""
        # Given
        generator = OpenClawGenerator()
        rules = self._create_mock_rules()
        
        # When
        skill_md = generator.generate(rules, skill_name="测试技能")
        
        # Then
        assert "步骤" in skill_md or "step" in skill_md.lower() or "流程" in skill_md

    def _create_mock_rules(self) -> ExtractedRules:
        """Create mock rules for testing."""
        return ExtractedRules(
            constraints=[
                Constraint(
                    id="C001",
                    level=ConstraintLevel.MUST,
                    description="折扣比例不得超过客户等级对应的上限",
                    condition="当折扣比例超过上限时",
                    action="拒绝审批并提示",
                    roles=["审批人"]
                ),
                Constraint(
                    id="C002",
                    level=ConstraintLevel.SHOULD,
                    description="所有折扣必须记录在系统中",
                    action="系统自动记录",
                    roles=["销售员"]
                )
            ],
            decisions=[
                DecisionTable(
                    id="D001",
                    name="折扣审批决策表",
                    input_vars=["客户等级", "订单金额"],
                    output_vars=["折扣比例", "审批级别"],
                    rules=[
                        DecisionRule(
                            when={"客户等级": "A", "订单金额": ">50万"},
                            then={"折扣比例": "15-20%", "审批级别": "总监"}
                        ),
                        DecisionRule(
                            when={"客户等级": "A", "订单金额": "10-50万"},
                            then={"折扣比例": "10-15%", "审批级别": "经理"}
                        )
                    ]
                )
            ],
            boundaries={
                "折扣上限": BoundaryParameter(name="折扣上限", max_value=25, unit="%")
            }
        )

    def _create_rules_with_constraints(self) -> ExtractedRules:
        """Create rules with only constraints."""
        return ExtractedRules(
            constraints=[
                Constraint(
                    id="C001",
                    level=ConstraintLevel.MUST,
                    description="必须验证用户身份",
                    action="调用身份验证服务",
                    roles=["系统"]
                ),
                Constraint(
                    id="C002",
                    level=ConstraintLevel.SHOULD,
                    description="应当记录操作日志",
                    action="写入日志系统",
                    roles=["系统"]
                ),
                Constraint(
                    id="C003",
                    level=ConstraintLevel.MAY,
                    description="可以发送通知",
                    action="发送邮件/短信",
                    roles=["系统"]
                )
            ]
        )

    def _create_rules_with_decisions(self) -> ExtractedRules:
        """Create rules with only decision tables."""
        return ExtractedRules(
            decisions=[
                DecisionTable(
                    id="D001",
                    name="审批决策表",
                    input_vars=["金额", "类型"],
                    output_vars=["审批人", "时效"],
                    rules=[
                        DecisionRule(
                            when={"金额": "<10万", "类型": "常规"},
                            then={"审批人": "主管", "时效": "1天"}
                        ),
                        DecisionRule(
                            when={"金额": "10-50万", "类型": "常规"},
                            then={"审批人": "经理", "时效": "2天"}
                        )
                    ]
                )
            ]
        )
