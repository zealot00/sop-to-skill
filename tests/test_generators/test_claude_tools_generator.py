"""Tests for Claude Tools JSON generator."""
import pytest
import json
from scripts.models import (
    ExtractedRules, Constraint, ConstraintLevel,
    DecisionTable, DecisionRule, BoundaryParameter
)
from scripts.generators.claude_tools_generator import ClaudeToolsGenerator


class TestClaudeToolsGenerator:
    """Test suite for ClaudeToolsGenerator."""

    def test_generate_claude_tools_json(self):
        """Test generating Claude Tools JSON."""
        # Given
        generator = ClaudeToolsGenerator()
        rules = self._create_mock_rules()
        
        # When
        tools = generator.generate(rules, skill_name="折扣权限管理")
        
        # Then
        assert tools is not None
        assert isinstance(tools, list)
        assert len(tools) > 0

    def test_claude_tools_have_required_fields(self):
        """Test that Claude tools have required fields."""
        # Given
        generator = ClaudeToolsGenerator()
        rules = self._create_mock_rules()
        
        # When
        tools = generator.generate(rules, skill_name="折扣管理")
        
        # Then
        for tool in tools:
            assert "name" in tool
            assert "description" in tool
            assert "input_schema" in tool or "parameters" in tool

    def test_claude_generate_with_constraints(self):
        """Test generating Claude tools with constraint rules."""
        # Given
        generator = ClaudeToolsGenerator()
        rules = self._create_mock_rules()
        
        # When
        tools = generator.generate(rules, skill_name="审批管理")
        
        # Then
        assert len(tools) > 0
        tool_names = [t.get("name", "") for t in tools]
        assert any("constraint" in name.lower() or "check" in name.lower() for name in tool_names)

    def test_claude_generate_with_decisions(self):
        """Test generating Claude tools with decision tables."""
        # Given
        generator = ClaudeToolsGenerator()
        rules = self._create_mock_rules()
        
        # When
        tools = generator.generate(rules, skill_name="审批流程")
        
        # Then
        assert len(tools) > 0
        tool_descriptions = " ".join([t.get("description", "") for t in tools])
        assert "决策" in tool_descriptions or "decision" in tool_descriptions.lower()

    def test_claude_input_schemas(self):
        """Test that Claude tools have proper input schemas."""
        # Given
        generator = ClaudeToolsGenerator()
        rules = self._create_mock_rules()
        
        # When
        tools = generator.generate(rules, skill_name="折扣管理")
        
        # Then
        for tool in tools:
            input_schema = tool.get("input_schema") or tool.get("parameters")
            if input_schema:
                assert isinstance(input_schema, dict)

    def test_claude_output_json_format(self):
        """Test that output is valid JSON."""
        # Given
        generator = ClaudeToolsGenerator()
        rules = self._create_mock_rules()
        
        # When
        tools = generator.generate(rules, skill_name="折扣管理")
        
        # Then
        # Should be valid JSON when serialized
        json_str = json.dumps(tools)
        parsed = json.loads(json_str)
        assert parsed == tools

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
                        )
                    ]
                )
            ],
            boundaries={
                "折扣上限": BoundaryParameter(name="折扣上限", max_value=25, unit="%")
            }
        )
