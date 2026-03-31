"""OpenClaw SKILL.md + scripts generator.

Generates OpenClaw Skill packages from extracted SOP rules.
"""
from typing import Dict, Any, List, Optional
from scripts.models import ExtractedRules, Constraint, ConstraintLevel, DecisionTable, DecisionRule


class OpenClawGenerator:
    """Generator for OpenClaw SKILL.md format."""

    def generate(self, rules: ExtractedRules, skill_name: str) -> str:
        """Generate OpenClaw SKILL.md content.

        Args:
            rules: Extracted rules from SOP document.
            skill_name: Name of the skill to generate.

        Returns:
            Generated SKILL.md content as string.
        """
        sections = []

        # Header
        sections.append(self._generate_header(skill_name))

        # When to Use (Triggers)
        sections.append(self._generate_triggers_section(rules))

        # Actions / Workflow Steps
        sections.append(self._generate_workflow_section(rules))

        # Constraints
        sections.append(self._generate_constraints_section(rules))

        # Decision Tables
        sections.append(self._generate_decisions_section(rules))

        # Boundaries
        sections.append(self._generate_boundaries_section(rules))

        return "\n\n".join(sections)

    def _generate_header(self, skill_name: str) -> str:
        """Generate the skill header.

        Args:
            skill_name: Name of the skill.

        Returns:
            Header section content.
        """
        return f"""# {skill_name}

**Meta-Skill**: 自动从 SOP 文档生成的可执行 Skill。

## When to Use

Use this skill when:
- 需要执行标准化业务流程
- 需要根据预定义规则进行决策
- 需要确保操作符合规范约束

## Triggers

触发条件:
- 收到执行请求
- 收到查询请求
- 收到审批请求"""

    def _generate_triggers_section(self, rules: ExtractedRules) -> str:
        """Generate triggers section.

        Args:
            rules: Extracted rules.

        Returns:
            Triggers section content.
        """
        triggers = ["收到执行请求"]

        # Add triggers based on constraints
        for constraint in rules.constraints:
            if constraint.condition:
                triggers.append(f"- {constraint.condition}")

        # Add triggers based on decision inputs
        for decision in rules.decisions:
            inputs = ", ".join(decision.input_vars)
            triggers.append(f"- 当 {inputs} 已知时")

        return f"""## Triggers

触发条件:
{chr(10).join(triggers)}"""

    def _generate_workflow_section(self, rules: ExtractedRules) -> str:
        """Generate workflow/steps section.

        Args:
            rules: Extracted rules.

        Returns:
            Workflow section content.
        """
        steps = []

        # Generate steps from constraints
        if rules.constraints:
            steps.append("1. 验证约束条件")
            for constraint in rules.constraints[:3]:
                if constraint.action:
                    steps.append(f"2. 执行: {constraint.action}")

        # Generate steps from decisions
        if rules.decisions:
            steps.append("3. 根据决策表确定结果")
            for decision in rules.decisions:
                steps.append(f"   - 决策表: {decision.name}")
                for i, rule in enumerate(decision.rules[:2], 1):
                    when_str = ", ".join(f"{k}={v}" for k, v in rule.when.items())
                    then_str = ", ".join(f"{k}={v}" for k, v in rule.then.items())
                    steps.append(f"     - 规则{i}: 当 {when_str} → 则 {then_str}")

        if not steps:
            steps = ["1. 接收输入", "2. 验证规则", "3. 执行操作", "4. 返回结果"]

        return f"""## Steps

执行步骤:

{chr(10).join(steps)}

## Actions

操作定义:
- **execute**: 执行主要操作
- **validate**: 验证输入是否符合规则
- **decide**: 根据决策表返回决策结果"""

    def _generate_constraints_section(self, rules: ExtractedRules) -> str:
        """Generate constraints section.

        Args:
            rules: Extracted rules.

        Returns:
            Constraints section content.
        """
        if not rules.constraints:
            return ""

        lines = ["## Constraints / 约束", "", "### Must (必须)"]
        for c in rules.constraints:
            if c.level == ConstraintLevel.MUST:
                lines.append(f"- **{c.id}**: {c.description}")
                if c.condition:
                    lines.append(f"  - 条件: {c.condition}")
                if c.action:
                    lines.append(f"  - 操作: {c.action}")

        lines.append("\n### Should (应当)")
        for c in rules.constraints:
            if c.level == ConstraintLevel.SHOULD:
                lines.append(f"- **{c.id}**: {c.description}")
                if c.action:
                    lines.append(f"  - 操作: {c.action}")

        lines.append("\n### May (可以)")
        for c in rules.constraints:
            if c.level == ConstraintLevel.MAY:
                lines.append(f"- **{c.id}**: {c.description}")

        return "\n".join(lines)

    def _generate_decisions_section(self, rules: ExtractedRules) -> str:
        """Generate decisions section.

        Args:
            rules: Extracted rules.

        Returns:
            Decisions section content.
        """
        if not rules.decisions:
            return ""

        lines = ["## Decisions / 决策规则", ""]

        for decision in rules.decisions:
            lines.append(f"### {decision.name} ({decision.id})")
            lines.append("")
            lines.append(f"**输入变量**: {', '.join(decision.input_vars)}")
            lines.append(f"**输出变量**: {', '.join(decision.output_vars)}")
            lines.append("")
            lines.append("**规则**:")
            for rule in decision.rules:
                when_str = ", ".join(f"{k}={v}" for k, v in rule.when.items())
                then_str = ", ".join(f"{k}={v}" for k, v in rule.then.items())
                lines.append(f"- 当 {when_str} → 则 {then_str}")

        return "\n".join(lines)

    def _generate_boundaries_section(self, rules: ExtractedRules) -> str:
        """Generate boundaries section.

        Args:
            rules: Extracted rules.

        Returns:
            Boundaries section content.
        """
        if not rules.boundaries:
            return ""

        lines = ["## Boundaries / 边界参数", ""]

        for name, param in rules.boundaries.items():
            line = f"- **{name}**: {param.name}"
            if param.min_value is not None:
                line += f", 最小值={param.min_value}"
            if param.max_value is not None:
                line += f", 最大值={param.max_value}"
            if param.default_value is not None:
                line += f", 默认值={param.default_value}"
            if param.unit:
                line += f" ({param.unit})"
            lines.append(line)

        return "\n".join(lines)
