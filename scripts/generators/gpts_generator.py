"""GPTs Instructions + Actions schema generator.

Generates GPTs instructions and OpenAPI Actions schema from SOP rules.
"""
from typing import Dict, Any, List
import json
from scripts.models import ExtractedRules, Constraint, ConstraintLevel, DecisionTable, DecisionRule


class GPTsGenerator:
    """Generator for GPTs Instructions and Actions schema."""

    def generate(self, rules: ExtractedRules, skill_name: str) -> Dict[str, Any]:
        """Generate complete GPTs package.

        Args:
            rules: Extracted rules from SOP document.
            skill_name: Name of the skill.

        Returns:
            Dictionary with 'instructions' and 'actions' keys.
        """
        return {
            "instructions": self.generate_instructions(rules, skill_name),
            "actions": self.generate_actions_schema(rules)
        }

    def generate_instructions(self, rules: ExtractedRules, skill_name: str) -> str:
        """Generate GPTs Instructions text.

        Args:
            rules: Extracted rules from SOP document.
            skill_name: Name of the skill.

        Returns:
            Generated instructions as string.
        """
        sections = []

        # System prompt
        sections.append(f"""You are {skill_name}, an AI assistant that helps with business operations.

## Role
You are a specialized assistant trained to handle {skill_name} tasks following standardized procedures.

## Core Capabilities
- Process requests according to established rules
- Make decisions based on decision tables
- Validate inputs against constraints
- Provide clear explanations for decisions""")

        # Constraints
        if rules.constraints:
            sections.append("\n## Rules (规则)")
            for constraint in rules.constraints:
                level_word = {
                    ConstraintLevel.MUST: "必须 (MUST)",
                    ConstraintLevel.SHOULD: "应当 (SHOULD)",
                    ConstraintLevel.MAY: "可以 (MAY)"
                }.get(constraint.level, "")

                sections.append(f"\n### {level_word}")
                sections.append(f"- {constraint.description}")
                if constraint.condition:
                    sections.append(f"  - 当满足条件: {constraint.condition}")
                if constraint.action:
                    sections.append(f"  - 执行操作: {constraint.action}")

        # Decision tables
        if rules.decisions:
            sections.append("\n## Decision Tables (决策表)")
            for decision in rules.decisions:
                sections.append(f"\n### {decision.name}")
                sections.append(f"**输入**: {', '.join(decision.input_vars)}")
                sections.append(f"**输出**: {', '.join(decision.output_vars)}")
                sections.append("\n**规则:**")
                for rule in decision.rules:
                    when_str = ", ".join(f"{k}={v}" for k, v in rule.when.items())
                    then_str = ", ".join(f"{k}={v}" for k, v in rule.then.items())
                    sections.append(f"- 当 [{when_str}] → 则 [{then_str}]")

        # Boundaries
        if rules.boundaries:
            sections.append("\n## Boundaries (边界参数)")
            for name, param in rules.boundaries.items():
                parts = [f"**{name}**"]
                if param.min_value is not None:
                    parts.append(f"最小值={param.min_value}")
                if param.max_value is not None:
                    parts.append(f"最大值={param.max_value}")
                if param.default_value is not None:
                    parts.append(f"默认值={param.default_value}")
                if param.unit:
                    parts.append(f"单位={param.unit}")
                sections.append("- " + ", ".join(parts))

        # Instructions
        sections.append("""
## Instructions for Use

1. When asked to process a request, first identify the relevant constraints
2. Check if the input meets all MUST constraints before proceeding
3. Use decision tables to determine the appropriate response
4. If a constraint is violated, explain which constraint and why
5. Provide clear reasoning for any decisions made""")

        return "\n".join(sections)

    def generate_actions_schema(self, rules: ExtractedRules) -> Dict[str, Any]:
        """Generate GPTs Actions OpenAPI schema.

        Args:
            rules: Extracted rules from SOP document.

        Returns:
            OpenAPI-style schema dictionary.
        """
        actions = []

        # Generate actions from constraints
        for constraint in rules.constraints:
            if constraint.action:
                action = {
                    "name": self._to_camel_case(f"{constraint.id}_{constraint.action}"),
                    "description": f"{constraint.description}. {constraint.action if constraint.action else ''}",
                    "parameters": {
                        "type": "object",
                        "properties": self._generate_constraint_properties(constraint),
                        "required": ["input_data"]
                    }
                }
                actions.append(action)

        # Generate actions from decision tables
        for decision in rules.decisions:
            action = {
                "name": self._to_camel_case(f"decide_{decision.id}"),
                "description": f"使用决策表 {decision.name} 确定结果",
                "parameters": {
                    "type": "object",
                    "properties": self._generate_decision_properties(decision),
                    "required": decision.input_vars
                }
            }
            actions.append(action)

        # Default actions if none generated
        if not actions:
            actions = [
                {
                    "name": "processRequest",
                    "description": "处理标准业务请求",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "request_data": {"type": "string", "description": "请求数据"}
                        },
                        "required": ["request_data"]
                    }
                },
                {
                    "name": "validateInput",
                    "description": "验证输入是否符合规则",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "input_data": {"type": "string", "description": "待验证的输入数据"}
                        },
                        "required": ["input_data"]
                    }
                }
            ]

        return {
            "actions": actions
        }

    def _generate_constraint_properties(self, constraint: Constraint) -> Dict[str, Any]:
        """Generate property schema for constraint action.

        Args:
            constraint: Constraint rule.

        Returns:
            Properties dictionary.
        """
        properties = {
            "input_data": {
                "type": "object",
                "description": f"输入数据，用于检查约束 {constraint.id}"
            },
            "context": {
                "type": "object",
                "description": "执行上下文，包含角色等信息"
            }
        }

        if constraint.condition:
            properties["condition_check"] = {
                "type": "boolean",
                "description": f"条件检查: {constraint.condition}"
            }

        return properties

    def _generate_decision_properties(self, decision: DecisionTable) -> Dict[str, Any]:
        """Generate property schema for decision action.

        Args:
            decision: Decision table.

        Returns:
            Properties dictionary.
        """
        properties = {}

        for var in decision.input_vars:
            properties[var] = {
                "type": "string",
                "description": f"决策输入变量: {var}"
            }

        return properties

    def _to_camel_case(self, text: str) -> str:
        """Convert text to CamelCase.

        Args:
            text: Text to convert.

        Returns:
            CamelCase text.
        """
        # Replace non-alphanumeric with spaces, then title case
        words = ''.join(c if c.isalnum() else ' ' for c in text).split()
        return ''.join(w.title() for w in words)
