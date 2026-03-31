"""Tests for constraints.yaml generator."""
import pytest
import sys
import yaml
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scripts.models import Constraint, ConstraintLevel, ConstraintType, ExtractedRules
from scripts.transformer.constraint_yaml_generator import generate_constraints_yaml


class TestConstraintYamlGenerator:
    """Test suite for constraints.yaml generation."""

    def test_generate_constraints_yaml_empty(self):
        """空约束列表应生成有效但为空的 YAML。"""
        rules = ExtractedRules(constraints=[], decisions=[], roles={})
        result = generate_constraints_yaml(rules)
        assert isinstance(result, str)
        data = yaml.safe_load(result)
        assert data is not None
        assert "constraints" in data
        assert isinstance(data["constraints"], list)

    def test_generate_constraints_yaml(self):
        """MUST 级别的约束应正确生成。"""
        constraints = [
            Constraint(
                id="c1",
                level=ConstraintLevel.MUST,
                description="折扣比例不得超过上限",
                condition="当订单金额超过10万",
                roles=["sales"]
            ),
            Constraint(
                id="c2",
                level=ConstraintLevel.SHOULD,
                description="应当在24小时内完成审批",
                roles=["manager"]
            ),
            Constraint(
                id="c3",
                level=ConstraintLevel.MAY,
                description="可以申请特殊折扣",
                roles=["sales"]
            )
        ]
        rules = ExtractedRules(
            constraints=constraints,
            decisions=[],
            roles={}
        )
        result = generate_constraints_yaml(rules)
        data = yaml.safe_load(result)
        assert "constraints" in data
        constraint_list = data["constraints"]
        assert len(constraint_list) == 3
        # MUST 约束
        must_c = next((c for c in constraint_list if c["id"] == "c1"), None)
        assert must_c is not None
        assert must_c["level"] == "must"
        assert "折扣比例" in must_c["description"]
        # SHOULD 约束
        should_c = next((c for c in constraint_list if c["id"] == "c2"), None)
        assert should_c is not None
        assert should_c["level"] == "should"

    def test_constraints_yaml_contains_all_fields(self):
        """每个约束应包含所有关键字段。"""
        constraints = [
            Constraint(
                id="c1",
                level=ConstraintLevel.MUST,
                description="必须记录所有操作",
                condition="任何操作",
                action="记录到系统",
                roles=["operator"],
                needs_human_judgment=False,
                confidence=0.95
            )
        ]
        rules = ExtractedRules(constraints=constraints)
        result = generate_constraints_yaml(rules)
        data = yaml.safe_load(result)
        c = data["constraints"][0]
        assert c["id"] == "c1"
        assert c["level"] == "must"
        assert "描述" in c or "description" in c
        assert c["condition"] == "任何操作"
        assert "operator" in c["roles"]

    def test_constraints_yaml_yaml_valid(self):
        """生成的 YAML 必须是有效的可解析格式。"""
        constraints = [
            Constraint(
                id="c1",
                level=ConstraintLevel.MUST,
                description="Test constraint",
            )
        ]
        rules = ExtractedRules(constraints=constraints)
        result = generate_constraints_yaml(rules)
        # 不应抛出异常
        data = yaml.safe_load(result)
        assert data is not None
        assert "constraints" in data
