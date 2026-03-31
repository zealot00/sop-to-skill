"""Core data models for SOP to Skill conversion."""
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from enum import Enum


class ConstraintLevel(str, Enum):
    """约束级别"""
    MUST = "must"      # 必须
    SHOULD = "should"  # 应当
    MAY = "may"        # 可以


class ConstraintType(str, Enum):
    """约束类型"""
    CONSTRAINT = "constraint"
    PROCEDURE = "procedure"
    PERMISSION = "permission"
    EXCEPTION = "exception"


@dataclass
class Heading:
    """标题"""
    level: int
    text: str
    line_number: int = 0


@dataclass
class Table:
    """表格"""
    headers: List[str]
    rows: List[List[str]]
    source: str = ""


@dataclass
class ListItem:
    """列表项"""
    text: str
    list_type: str  # "ordered" or "unordered"
    level: int = 0


@dataclass
class ParsedDocument:
    """解析后的文档结构"""
    headings: List[Heading] = field(default_factory=list)
    paragraphs: List[str] = field(default_factory=list)
    tables: List[Table] = field(default_factory=list)
    lists: List[ListItem] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    raw_text: str = ""


@dataclass
class Constraint:
    """约束规则"""
    id: str
    level: ConstraintLevel
    description: str
    condition: Optional[str] = None
    action: Optional[str] = None
    roles: List[str] = field(default_factory=list)
    needs_human_judgment: bool = False
    confidence: float = 0.9
    source_quote: Optional[str] = None


@dataclass
class DecisionRule:
    """决策规则"""
    when: Dict[str, str]
    then: Dict[str, str]


@dataclass
class DecisionTable:
    """决策表"""
    id: str
    name: str
    input_vars: List[str]
    output_vars: List[str]
    rules: List[DecisionRule] = field(default_factory=list)


@dataclass
class BoundaryParameter:
    """边界参数"""
    name: str
    min_value: Optional[Any] = None
    max_value: Optional[Any] = None
    default_value: Optional[Any] = None
    unit: str = ""
    source: str = ""
    confidence: float = 0.8


@dataclass
class SubjectiveItem:
    """需要主观判断的项目"""
    description: str
    markers: List[str] = field(default_factory=list)
    recommendation: str = ""


@dataclass
class AmbiguityNote:
    """模糊点记录"""
    text: str
    reason: str
    suggestion: str


@dataclass
class ExtractedRules:
    """提取的规则集合"""
    constraints: List[Constraint] = field(default_factory=list)
    decisions: List[DecisionTable] = field(default_factory=list)
    roles: Dict[str, Dict[str, str]] = field(default_factory=dict)
    boundaries: Dict[str, BoundaryParameter] = field(default_factory=dict)
    subjective_judgments: List[SubjectiveItem] = field(default_factory=list)
    ambiguity_notes: List[AmbiguityNote] = field(default_factory=list)


@dataclass
class ValidationIssue:
    """验证问题"""
    type: str
    severity: str  # error, warning, info
    message: str
    location: Optional[str] = None


@dataclass
class ValidationReport:
    """验证报告"""
    passed: bool
    score: float
    issues: List[ValidationIssue] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class SkillPackage:
    """生成的 Skill 包"""
    files: Dict[str, str] = field(default_factory=dict)
    validation_report: Optional[ValidationReport] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def write_to_directory(self, path: str):
        """将 Skill 包写入目录"""
        import os
        from pathlib import Path
        
        base_path = Path(path)
        base_path.mkdir(parents=True, exist_ok=True)
        
        for file_path, content in self.files.items():
            full_path = base_path / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content, encoding='utf-8')
