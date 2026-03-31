"""LangChain Tools generator.

Generates LangChain Tools from SOP rules.
"""
from typing import Dict, Any, List
from scripts.models import ExtractedRules, Constraint, ConstraintLevel, DecisionTable, DecisionRule


class LangChainGenerator:
    """Generator for LangChain Tools format."""

    def generate(self, rules: ExtractedRules, skill_name: str) -> Dict[str, Any]:
        """Generate LangChain Tools definition.

        Args:
            rules: Extracted rules from SOP document.
            skill_name: Name of the skill.

        Returns:
            LangChain tools dictionary with tool definitions.
        """
        tools = []

        # Generate tools from constraints
        for constraint in rules.constraints:
            tool = self._constraint_to_langchain_tool(constraint)
            tools.append(tool)

        # Generate tools from decision tables
        for decision in rules.decisions:
            tool = self._decision_to_langchain_tool(decision)
            tools.append(tool)

        return {
            "tools": tools,
            "skill_name": skill_name,
            "metadata": {
                "constraint_count": len(rules.constraints),
                "decision_count": len(rules.decisions),
                "boundary_count": len(rules.boundaries)
            }
        }

    def generate_pydantic_models(self, rules: ExtractedRules) -> str:
        """Generate Pydantic models for input validation.

        Args:
            rules: Extracted rules.

        Returns:
            Python code with Pydantic model definitions.
        """
        lines = [
            "from pydantic import BaseModel, Field",
            "from typing import Optional, List, Dict, Any",
            "",
            "",
            "# Auto-generated models from SOP rules",
            ""
        ]

        # Generate models for decision inputs
        for decision in rules.decisions:
            model_name = self._to_pascal_case(decision.id)
            lines.append(f"class {model_name}Input(BaseModel):")

            for var in decision.input_vars:
                lines.append(f'    {var}: str = Field(description="{var}")')

            lines.append("")
            lines.append(f"class {model_name}Output(BaseModel):")

            for var in decision.output_vars:
                lines.append(f'    {var}: str = Field(description="{var}")')

            lines.append("")
            lines.append(f"class {model_name}Decision:")
            lines.append(f"    \"\"\"决策表: {decision.name}\"\"\"")

            # Add rules as docstring
            lines.append('    """')
            lines.append(f"    决策表: {decision.name}")
            lines.append("    规则:")
            for rule in decision.rules:
                when_str = ", ".join(f"{k}={v}" for k, v in rule.when.items())
                then_str = ", ".join(f"{k}={v}" for k, v in rule.then.items())
                lines.append(f"      当 {when_str} → 则 {then_str}")
            lines.append('    """')

            lines.append("")
            lines.append(f"    @staticmethod")
            lines.append(f"    def decide(input_data: {model_name}Input) -> {model_name}Output:")
            lines.append(f"        \"\"\"根据输入数据返回决策结果\"\"\"")
            lines.append("        pass")
            lines.append("")
            lines.append("")

        # Generate models for boundaries
        if rules.boundaries:
            lines.append("class BoundaryParameters(BaseModel):")
            for name, param in rules.boundaries.items():
                field_name = self._to_snake_case(name)
                lines.append(f'    {field_name}: Optional[float] = Field(None, description="{param.name}")')
            lines.append("")

        return "\n".join(lines)

    def _constraint_to_langchain_tool(self, constraint: Constraint) -> Dict[str, Any]:
        """Convert constraint to LangChain tool.

        Args:
            constraint: Constraint rule.

        Returns:
            LangChain tool dictionary.
        """
        tool_name = f"check_{constraint.id}"

        description_parts = [f"[{constraint.level.value.upper()}] {constraint.description}"]

        if constraint.condition:
            description_parts.append(f"条件: {constraint.condition}")
        if constraint.action:
            description_parts.append(f"操作: {constraint.action}")

        if constraint.roles:
            description_parts.append(f"适用角色: {', '.join(constraint.roles)}")

        return {
            "name": tool_name,
            "description": " | ".join(description_parts),
            "parameters": {
                "type": "object",
                "properties": {
                    "input_data": {
                        "type": "object",
                        "description": "待检查的输入数据"
                    },
                    "context": {
                        "type": "object",
                        "description": "执行上下文，包含角色等信息",
                        "default": {}
                    }
                },
                "required": ["input_data"]
            }
        }

    def _decision_to_langchain_tool(self, decision: DecisionTable) -> Dict[str, Any]:
        """Convert decision table to LangChain tool.

        Args:
            decision: Decision table.

        Returns:
            LangChain tool dictionary.
        """
        tool_name = f"decide_{decision.id}"

        properties = {}
        for var in decision.input_vars:
            properties[var] = {
                "type": "string",
                "description": f"决策输入: {var}"
            }

        properties["_rules"] = {
            "type": "array",
            "description": "决策规则 (可选, 如果不提供则使用默认规则)"
        }

        # Add default rules
        rules_data = []
        for rule in decision.rules:
            rules_data.append({
                "when": rule.when,
                "then": rule.then
            })

        return {
            "name": tool_name,
            "description": f"决策表: {decision.name} | 输入: {', '.join(decision.input_vars)} | 输出: {', '.join(decision.output_vars)}",
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": decision.input_vars,
                "_default_rules": rules_data
            }
        }

    def _to_pascal_case(self, text: str) -> str:
        """Convert text to PascalCase.

        Args:
            text: Text to convert.

        Returns:
            PascalCase text.
        """
        words = ''.join(c if c.isalnum() else ' ' for c in text).split()
        return ''.join(w.title() for w in words)

    def _to_snake_case(self, text: str) -> str:
        """Convert text to snake_case.

        Args:
            text: Text to convert.

        Returns:
            snake_case text.
        """
        import re
        s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', text)
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()
