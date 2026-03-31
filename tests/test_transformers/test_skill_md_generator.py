"""Tests for SKILL.md generator."""
import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scripts.models import (
    Constraint, ConstraintLevel, ConstraintType,
    DecisionTable, DecisionRule, ExtractedRules,
    BoundaryParameter, SubjectiveItem, AmbiguityNote
)
from scripts.transformer.skill_md_generator import generate_skill_md, SKILLMDContent


class TestSkillMdGenerator:
    """Test suite for SKILL.md generation."""

    def test_generate_skill_md_minimal(self):
        """生成最小化 SKILL.md（仅有必需字段）。"""
        rules = ExtractedRules(
            constraints=[],
            decisions=[],
            roles={},
            boundaries={},
            subjective_judgments=[],
            ambiguity_notes=[]
        )
        content = generate_skill_md(
            rules=rules,
            skill_name="折扣管理",
            description="管理折扣权限的 Skill"
        )
        assert isinstance(content, SKILLMDContent)
        # 验证 frontmatter 包含必需字段
        assert "name:" in content.frontmatter
        assert "description:" in content.frontmatter
        assert "折扣管理" in content.frontmatter
        assert "管理折扣权限" in content.frontmatter
        # 验证有 markdown body
        assert content.body is not None
        assert len(content.body) > 0

    def test_skill_md_trigger_section(self):
        """触发条件章节（When to Use）应包含约束中的条件。"""
        constraints = [
            Constraint(
                id="c1",
                level=ConstraintLevel.MUST,
                description="折扣比例不得超过上限",
                condition="当订单金额超过10万",
                roles=["sales"]
            )
        ]
        rules = ExtractedRules(
            constraints=constraints,
            decisions=[],
            roles={},
            boundaries={},
            subjective_judgments=[],
            ambiguity_notes=[]
        )
        content = generate_skill_md(
            rules=rules,
            skill_name="折扣管理",
            description="管理折扣权限"
        )
        # When to Use section should mention trigger condition
        assert "触发" in content.body or "condition" in content.body.lower() or "当" in content.body

    def test_skill_md_constraints_section(self):
        """约束章节应包含 MUST/SHOULD 级别的规则。"""
        constraints = [
            Constraint(
                id="c1",
                level=ConstraintLevel.MUST,
                description="必须记录所有折扣申请",
                roles=["sales"]
            ),
            Constraint(
                id="c2",
                level=ConstraintLevel.SHOULD,
                description="应当在24小时内完成审批",
                roles=["manager"]
            )
        ]
        rules = ExtractedRules(
            constraints=constraints,
            decisions=[],
            roles={},
            boundaries={},
            subjective_judgments=[],
            ambiguity_notes=[]
        )
        content = generate_skill_md(
            rules=rules,
            skill_name="折扣审批",
            description="折扣审批流程"
        )
        assert "must" in content.body.lower() or "必须" in content.body
        assert "should" in content.body.lower() or "应当" in content.body

    def test_skill_md_with_roles(self):
        """角色信息应出现在 SKILL.md 中。"""
        rules = ExtractedRules(
            constraints=[],
            decisions=[],
            roles={
                "sales": {"name": "销售员", "description": "负责提交折扣申请"},
                "manager": {"name": "经理", "description": "负责审批"}
            },
            boundaries={},
            subjective_judgments=[],
            ambiguity_notes=[]
        )
        content = generate_skill_md(
            rules=rules,
            skill_name="折扣管理",
            description="折扣权限管理"
        )
        assert "sales" in content.body or "销售" in content.body

    def test_skill_md_full_package(self):
        """完整 SKILL.md 应包含所有章节。"""
        constraints = [
            Constraint(
                id="c1",
                level=ConstraintLevel.MUST,
                description="折扣比例不得超过客户等级上限",
                condition="任何折扣申请",
                roles=["sales", "manager"]
            )
        ]
        decisions = [
            DecisionTable(
                id="d1",
                name="折扣决策表",
                input_vars=["订单金额", "客户等级"],
                output_vars=["折扣比例", "审批级别"],
                rules=[
                    DecisionRule(
                        when={"订单金额": ">50万", "客户等级": "A"},
                        then={"折扣比例": "15-20%", "审批级别": "总监"}
                    )
                ]
            )
        ]
        boundaries = {
            "discount_rate": BoundaryParameter(
                name="折扣比例",
                min_value=0,
                max_value=25,
                unit="%"
            )
        }
        rules = ExtractedRules(
            constraints=constraints,
            decisions=decisions,
            roles={},
            boundaries=boundaries,
            subjective_judgments=[],
            ambiguity_notes=[]
        )
        content = generate_skill_md(
            rules=rules,
            skill_name="折扣管理",
            description="完整的折扣权限管理 Skill"
        )
        # frontmatter 必须包含 name 和 description
        assert "name:" in content.frontmatter
        assert "description:" in content.frontmatter
        # body 应包含关键章节
        assert content.body is not None
        assert len(content.body) > 50  # 不只是占位符

    def test_frontmatter_format(self):
        """Frontmatter 应为有效的 YAML 格式。"""
        import yaml
        rules = ExtractedRules()
        content = generate_skill_md(
            rules=rules,
            skill_name="测试Skill",
            description="测试描述"
        )
        # frontmatter 格式: --- name: xxx\ndescription: yyy\n---\n
        # 去掉头尾 --- 行后解析 YAML
        lines = content.frontmatter.strip().split("\n")
        # 去掉首尾的 ---
        yaml_lines = [l for l in lines if not l.startswith("---")]
        fm = yaml.safe_load("\n".join(yaml_lines))
        assert fm is not None
        assert fm["name"] == "测试Skill"
        assert fm["description"] == "测试描述"
