"""Tests for parameters.json generator."""
import pytest
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scripts.models import BoundaryParameter, ExtractedRules
from scripts.transformer.parameters_generator import generate_parameters_json


class TestParametersGenerator:
    """Test suite for parameters.json generation."""

    def test_generate_parameters_json_empty(self):
        """空边界参数应生成有效但为空的 JSON。"""
        rules = ExtractedRules(boundaries={})
        result = generate_parameters_json(rules)
        assert isinstance(result, str)
        data = json.loads(result)
        assert "parameters" in data
        assert isinstance(data["parameters"], list)

    def test_generate_parameters_json(self):
        """边界参数应正确生成。"""
        boundaries = {
            "discount_rate": BoundaryParameter(
                name="折扣比例",
                min_value=0,
                max_value=25,
                default_value=5,
                unit="%"
            ),
            "approval_amount": BoundaryParameter(
                name="审批金额",
                min_value=0,
                max_value=1000000,
                unit="元"
            )
        }
        rules = ExtractedRules(boundaries=boundaries)
        result = generate_parameters_json(rules)
        data = json.loads(result)
        assert "parameters" in data
        params = data["parameters"]
        assert len(params) == 2
        # 折扣比例参数
        dr_param = next((p for p in params if p["name"] == "折扣比例"), None)
        assert dr_param is not None
        assert dr_param["min_value"] == 0
        assert dr_param["max_value"] == 25
        assert dr_param["default_value"] == 5
        assert dr_param["unit"] == "%"

    def test_parameters_json_all_fields(self):
        """每个参数应包含所有关键字段。"""
        boundaries = {
            "test_param": BoundaryParameter(
                name="测试参数",
                min_value=1,
                max_value=100,
                default_value=50,
                unit="个"
            )
        }
        rules = ExtractedRules(boundaries=boundaries)
        result = generate_parameters_json(rules)
        data = json.loads(result)
        param = data["parameters"][0]
        assert param["name"] == "测试参数"
        assert param["min_value"] == 1
        assert param["max_value"] == 100
        assert param["default_value"] == 50
        assert param["unit"] == "个"

    def test_parameters_json_valid_json(self):
        """生成的 JSON 必须是有效的可解析格式。"""
        rules = ExtractedRules(
            boundaries={
                "p1": BoundaryParameter(name="参数1", min_value=0, max_value=10)
            }
        )
        result = generate_parameters_json(rules)
        # 不应抛出异常
        data = json.loads(result)
        assert data is not None
        assert "parameters" in data
