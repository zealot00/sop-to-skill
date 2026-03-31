"""Tests for decision_table.yaml generator."""
import pytest
import sys
import yaml
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scripts.models import (
    DecisionTable, DecisionRule, ExtractedRules
)
from scripts.transformer.decision_yaml_generator import generate_decision_table_yaml


class TestDecisionYamlGenerator:
    """Test suite for decision_table.yaml generation."""

    def test_generate_decision_table_yaml_empty(self):
        """空决策表应生成有效但为空的 YAML。"""
        rules = ExtractedRules(decisions=[], constraints=[])
        result = generate_decision_table_yaml(rules)
        assert isinstance(result, str)
        data = yaml.safe_load(result)
        assert data is not None
        assert "decision_tables" in data
        assert isinstance(data["decision_tables"], list)

    def test_generate_decision_table_yaml(self):
        """决策表应正确生成，包含输入/输出变量和规则。"""
        decisions = [
            DecisionTable(
                id="dt1",
                name="折扣决策表",
                input_vars=["订单金额", "客户等级"],
                output_vars=["折扣比例", "审批级别"],
                rules=[
                    DecisionRule(
                        when={"订单金额": ">50万", "客户等级": "A"},
                        then={"折扣比例": "15-20%", "审批级别": "总监"}
                    ),
                    DecisionRule(
                        when={"订单金额": "10-50万", "客户等级": "A"},
                        then={"折扣比例": "10-15%", "审批级别": "经理"}
                    )
                ]
            )
        ]
        rules = ExtractedRules(decisions=decisions, constraints=[])
        result = generate_decision_table_yaml(rules)
        data = yaml.safe_load(result)
        assert "decision_tables" in data
        tables = data["decision_tables"]
        assert len(tables) == 1
        table = tables[0]
        assert table["id"] == "dt1"
        assert table["name"] == "折扣决策表"
        assert table["input_vars"] == ["订单金额", "客户等级"]
        assert table["output_vars"] == ["折扣比例", "审批级别"]
        assert len(table["rules"]) == 2
        assert table["rules"][0]["when"]["订单金额"] == ">50万"

    def test_decision_table_yaml_multiple_tables(self):
        """应支持多个决策表。"""
        decisions = [
            DecisionTable(
                id="dt1",
                name="折扣决策",
                input_vars=["金额"],
                output_vars=["折扣"],
                rules=[]
            ),
            DecisionTable(
                id="dt2",
                name="审批决策",
                input_vars=["折扣比例"],
                output_vars=["审批人"],
                rules=[]
            )
        ]
        rules = ExtractedRules(decisions=decisions, constraints=[])
        result = generate_decision_table_yaml(rules)
        data = yaml.safe_load(result)
        assert len(data["decision_tables"]) == 2

    def test_decision_table_yaml_rules_format(self):
        """规则格式应正确：when + then。"""
        decisions = [
            DecisionTable(
                id="dt1",
                name="测试决策",
                input_vars=["输入1"],
                output_vars=["输出1"],
                rules=[
                    DecisionRule(
                        when={"输入1": "条件A"},
                        then={"输出1": "结果X"}
                    )
                ]
            )
        ]
        rules = ExtractedRules(decisions=decisions, constraints=[])
        result = generate_decision_table_yaml(rules)
        data = yaml.safe_load(result)
        rule = data["decision_tables"][0]["rules"][0]
        assert "when" in rule
        assert "then" in rule
        assert rule["when"]["输入1"] == "条件A"
        assert rule["then"]["输出1"] == "结果X"

    def test_decision_table_yaml_valid_yaml(self):
        """生成的 YAML 必须是有效的可解析格式。"""
        decisions = [
            DecisionTable(
                id="dt1",
                name="简单决策",
                input_vars=["x"],
                output_vars=["y"],
                rules=[DecisionRule(when={"x": "1"}, then={"y": "2"})]
            )
        ]
        rules = ExtractedRules(decisions=decisions, constraints=[])
        result = generate_decision_table_yaml(rules)
        # 不应抛出异常
        data = yaml.safe_load(result)
        assert data is not None
