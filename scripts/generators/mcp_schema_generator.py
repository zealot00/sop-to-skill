"""MCP (Model Context Protocol) tools.json schema generator.

Generates MCP tools.json from SOP rules.
"""
from typing import Dict, Any, List
from scripts.models import ExtractedRules, Constraint, ConstraintLevel, DecisionTable, DecisionRule


class MCPSchemaGenerator:
    """Generator for MCP tools.json schema."""

    def generate(self, rules: ExtractedRules, skill_name: str) -> Dict[str, Any]:
        """Generate MCP tools.json schema.

        Args:
            rules: Extracted rules from SOP document.
            skill_name: Name of the skill.

        Returns:
            MCP tools schema dictionary.
        """
        tools = []

        # Generate tools from constraints
        for constraint in rules.constraints:
            tool = self._constraint_to_tool(constraint)
            tools.append(tool)

        # Generate tools from decision tables
        for decision in rules.decisions:
            tool = self._decision_to_tool(decision)
            tools.append(tool)

        # Generate validation tool
        if rules.constraints:
            validation_tool = self._generate_validation_tool(rules)
            tools.append(validation_tool)

        # Generate info tool
        info_tool = self._generate_info_tool(skill_name, rules)
        tools.append(info_tool)

        return {
            "tools": tools
        }

    def _constraint_to_tool(self, constraint: Constraint) -> Dict[str, Any]:
        """Convert constraint to MCP tool.

        Args:
            constraint: Constraint rule.

        Returns:
            MCP tool dictionary.
        """
        tool_name = f"check_{constraint.id}"

        properties = {
            "input_data": {
                "type": "object",
                "description": "待检查的输入数据"
            }
        }

        required = ["input_data"]

        if constraint.condition:
            properties["condition"] = {
                "type": "string",
                "description": f"条件: {constraint.condition}"
            }

        return {
            "name": tool_name,
            "description": f"[{constraint.level.value.upper()}] {constraint.description}",
            "inputSchema": {
                "type": "object",
                "properties": properties,
                "required": required
            }
        }

    def _decision_to_tool(self, decision: DecisionTable) -> Dict[str, Any]:
        """Convert decision table to MCP tool.

        Args:
            decision: Decision table.

        Returns:
            MCP tool dictionary.
        """
        tool_name = f"decide_{decision.id}"

        properties = {}
        for var in decision.input_vars:
            properties[var] = {
                "type": "string",
                "description": f"输入: {var}"
            }

        return {
            "name": tool_name,
            "description": f"决策表: {decision.name} - 输入({', '.join(decision.input_vars)}) → 输出({', '.join(decision.output_vars)})",
            "inputSchema": {
                "type": "object",
                "properties": properties,
                "required": decision.input_vars
            }
        }

    def _generate_validation_tool(self, rules: ExtractedRules) -> Dict[str, Any]:
        """Generate overall validation tool.

        Args:
            rules: Extracted rules.

        Returns:
            Validation tool dictionary.
        """
        return {
            "name": "validate_all",
            "description": "验证输入是否满足所有约束条件",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "data": {
                        "type": "object",
                        "description": "待验证的完整数据"
                    }
                },
                "required": ["data"]
            }
        }

    def _generate_info_tool(self, skill_name: str, rules: ExtractedRules) -> Dict[str, Any]:
        """Generate info/get-help tool.

        Args:
            skill_name: Name of the skill.
            rules: Extracted rules.

        Returns:
            Info tool dictionary.
        """
        constraint_count = len(rules.constraints)
        decision_count = len(rules.decisions)

        return {
            "name": "get_help",
            "description": f"获取 {skill_name} 的帮助信息，包含 {constraint_count} 个约束规则和 {decision_count} 个决策表",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "description": "帮助主题 (可选: rules, decisions, boundaries)"
                    }
                }
            }
        }
