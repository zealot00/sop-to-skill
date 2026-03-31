"""Tests for GPTs Instructions + Actions schema generator."""
import pytest
import json
from scripts.models import (
    ExtractedRules, Constraint, ConstraintLevel, ConstraintType,
    DecisionTable, DecisionRule, BoundaryParameter
)
from scripts.generators.gpts_generator import GPTsGenerator


class TestGPTsGenerator:
    """Test suite for GPTsGenerator."""

    def test_generate_gpts_instructions(self):
        """Test generating GPTs Instructions text."""
        # Given
        generator = GPTsGenerator()
        rules = self._create_mock_rules()
        
        # When
        instructions = generator.generate_instructions(rules, skill_name="折扣权限管理")
        
        # Then
        assert instructions is not None
        assert len(instructions) > 100
        assert "折扣" in instructions or "discount" in instructions.lower()
        assert "规则" in instructions or "rule" in instructions.lower()

    def test_generate_gpts_actions_schema(self):
        """Test generating GPTs Actions OpenAPI schema."""
        # Given
        generator = GPTsGenerator()
        rules = self._create_mock_rules()
        
        # When
        schema = generator.generate_actions_schema(rules)
        
        # Then
        assert schema is not None
        assert isinstance(schema, dict)
        # Check OpenAPI structure
        assert "openapi" in schema or "actions" in schema

    def test_generate_gpts_with_constraints(self):
        """Test generating GPTs content with constraint rules."""
        # Given
        generator = GPTsGenerator()
        rules = self._create_mock_rules()
        
        # When
        instructions = generator.generate_instructions(rules, skill_name="审批管理")
        
        # Then
        assert "必须" in instructions or "must" in instructions.lower()
        assert "应当" in instructions or "should" in instructions.lower()

    def test_generate_gpts_with_decision_tables(self):
        """Test generating GPTs content with decision tables."""
        # Given
        generator = GPTsGenerator()
        rules = self._create_mock_rules()
        
        # When
        instructions = generator.generate_instructions(rules, skill_name="审批流程")
        
        # Then
        assert "决策" in instructions or "decision" in instructions.lower()
        assert "当" in instructions or "when" in instructions.lower()
        assert "则" in instructions or "then" in instructions.lower()

    def test_generate_actions_with_functions(self):
        """Test that actions schema includes function definitions."""
        # Given
        generator = GPTsGenerator()
        rules = self._create_mock_rules()
        
        # When
        schema = generator.generate_actions_schema(rules)
        
        # Then
        # Should have actions or functions array
        if "actions" in schema:
            assert len(schema["actions"]) > 0
        if "functions" in schema:
            assert len(schema["functions"]) > 0

    def test_full_gpts_output(self):
        """Test generating complete GPTs package."""
        # Given
        generator = GPTsGenerator()
        rules = self._create_mock_rules()
        
        # When
        output = generator.generate(rules, skill_name="折扣管理")
        
        # Then
        assert "instructions" in output
        assert "actions" in output or "schema" in output
        assert output["instructions"] is not None
        assert output["actions"] is not None or output["schema"] is not None

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
                ),
                Constraint(
                    id="C003",
                    level=ConstraintLevel.MUST,
                    description="超过20%的折扣需要总经理审批",
                    condition="当折扣 > 20%",
                    action="转交总经理审批",
                    roles=["系统"]
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
                        ),
                        DecisionRule(
                            when={"客户等级": "B", "订单金额": ">50万"},
                            then={"折扣比例": "10-15%", "审批级别": "经理"}
                        )
                    ]
                )
            ],
            boundaries={
                "折扣上限": BoundaryParameter(name="折扣上限", max_value=25, unit="%"),
                "最小订单金额": BoundaryParameter(name="最小订单金额", min_value=0, unit="元")
            }
        )
