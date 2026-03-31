"""Tests for MCP (Model Context Protocol) tools.json schema generator."""
import pytest
import json
from scripts.models import (
    ExtractedRules, Constraint, ConstraintLevel,
    DecisionTable, DecisionRule, BoundaryParameter
)
from scripts.generators.mcp_schema_generator import MCPSchemaGenerator


class TestMCPSchemaGenerator:
    """Test suite for MCPSchemaGenerator."""

    def test_generate_mcp_tools_json(self):
        """Test generating MCP tools.json schema."""
        # Given
        generator = MCPSchemaGenerator()
        rules = self._create_mock_rules()
        
        # When
        schema = generator.generate(rules, skill_name="折扣权限管理")
        
        # Then
        assert schema is not None
        assert isinstance(schema, dict)
        assert "tools" in schema
        assert isinstance(schema["tools"], list)
        assert len(schema["tools"]) > 0

    def test_mcp_tools_have_required_fields(self):
        """Test that MCP tools have required fields."""
        # Given
        generator = MCPSchemaGenerator()
        rules = self._create_mock_rules()
        
        # When
        schema = generator.generate(rules, skill_name="折扣管理")
        
        # Then
        for tool in schema["tools"]:
            assert "name" in tool
            assert "description" in tool
            assert "inputSchema" in tool or "parameters" in tool

    def test_mcp_generate_with_constraints(self):
        """Test generating MCP tools with constraint rules."""
        # Given
        generator = MCPSchemaGenerator()
        rules = self._create_mock_rules()
        
        # When
        schema = generator.generate(rules, skill_name="审批管理")
        
        # Then
        assert len(schema["tools"]) > 0
        # Should have tools for checking constraints
        tool_names = [t.get("name", "") for t in schema["tools"]]
        assert any("constraint" in name.lower() or "check" in name.lower() for name in tool_names)

    def test_mcp_generate_with_decisions(self):
        """Test generating MCP tools with decision tables."""
        # Given
        generator = MCPSchemaGenerator()
        rules = self._create_mock_rules()
        
        # When
        schema = generator.generate(rules, skill_name="审批流程")
        
        # Then
        assert len(schema["tools"]) > 0
        # Should have tools for decision making
        tool_descriptions = " ".join([t.get("description", "") for t in schema["tools"]])
        assert "决策" in tool_descriptions or "decision" in tool_descriptions.lower()

    def test_mcp_input_schemas(self):
        """Test that MCP tools have proper input schemas."""
        # Given
        generator = MCPSchemaGenerator()
        rules = self._create_mock_rules()
        
        # When
        schema = generator.generate(rules, skill_name="折扣管理")
        
        # Then
        for tool in schema["tools"]:
            input_schema = tool.get("inputSchema") or tool.get("parameters")
            if input_schema:
                assert isinstance(input_schema, dict)

    def test_mcp_output_json_format(self):
        """Test that output is valid JSON."""
        # Given
        generator = MCPSchemaGenerator()
        rules = self._create_mock_rules()
        
        # When
        schema = generator.generate(rules, skill_name="折扣管理")
        
        # Then
        # Should be valid JSON when serialized
        json_str = json.dumps(schema)
        parsed = json.loads(json_str)
        assert parsed == schema

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
