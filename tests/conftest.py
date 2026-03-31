"""Shared pytest fixtures and configuration."""
import pytest
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass

# 测试数据 fixtures
SIMPLE_SOP_MARKDOWN = """# 折扣权限管理 SOP

## 1. 目的
本文档定义了公司折扣权限的管理规范。

## 2. 适用范围
适用于所有销售订单的折扣审批。

## 3. 折扣规则

### 3.1 客户等级 A
- 订单金额 > 50万：折扣 15-20%，需总监审批
- 订单金额 10-50万：折扣 10-15%，需经理审批
- 订单金额 < 10万：折扣 3-5%，无需审批

### 3.2 客户等级 B
- 订单金额 > 50万：折扣 10-15%，需经理审批
- 订单金额 10-50万：折扣 5-10%，需主管审批
- 订单金额 < 10万：折扣 0-3%，无需审批

## 4. 审批流程
1. 销售员提交折扣申请
2. 系统自动判断折扣比例
3. 根据金额和客户等级确定审批级别
4. 审批人进行审批

## 5. 约束
- 折扣比例不得超过客户等级对应的上限
- 所有折扣必须记录在系统中
- 超过20%的折扣需要总经理审批
"""

SOP_WITH_TABLE = """# 审批权限矩阵

| 角色 | 审批金额上限 | 折扣上限 |
|------|-------------|---------|
| 主管 | 10万 | 5% |
| 经理 | 50万 | 15% |
| 总监 | 100万 | 25% |
| 总经理 | 无上限 | 无上限 |
"""

SOP_WITH_CONDITIONS = """# 订单处理规则

如果订单金额超过100万，则需要总经理审批。
如果客户为VIP等级，则享受优先处理。
当订单包含定制产品时，交付周期需要延长3天。
"""

SOP_AMBIGUOUS = """# 项目管理规范

在适当的时候，项目经理应当根据实际情况做出合理判断。
对于特殊情况，可以酌情处理，但需要保留记录。
"""


@dataclass
class MockConstraint:
    """测试用约束对象"""
    id: str
    level: str
    description: str
    condition: str = None
    action: str = None
    needs_human_judgment: bool = False
    confidence: float = 0.9


@dataclass
class MockDecisionTable:
    """测试用决策表对象"""
    id: str
    name: str
    input_vars: List[str]
    output_vars: List[str]
    rules: List[Dict[str, Any]]


# Pytest fixtures
@pytest.fixture
def simple_sop_markdown():
    """简单 SOP Markdown 文本"""
    return SIMPLE_SOP_MARKDOWN


@pytest.fixture
def sop_with_table():
    """含表格的 SOP"""
    return SOP_WITH_TABLE


@pytest.fixture
def sop_with_conditions():
    """含条件分支的 SOP"""
    return SOP_WITH_CONDITIONS


@pytest.fixture
def sop_ambiguous():
    """含模糊表述的 SOP"""
    return SOP_AMBIGUOUS


@pytest.fixture
def fixtures_dir():
    """fixtures 目录路径"""
    return Path(__file__).parent.parent / "fixtures"


@pytest.fixture
def sops_dir(fixtures_dir):
    """SOP 测试文件目录"""
    return fixtures_dir / "sops"


@pytest.fixture
def expected_dir(fixtures_dir):
    """预期输出文件目录"""
    return fixtures_dir / "expected"
