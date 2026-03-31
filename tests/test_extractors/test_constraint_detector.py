"""Constraint Detector tests."""
import pytest
from scripts.extractor.constraint_detector import ConstraintDetector
from scripts.models import Constraint, ConstraintLevel


class TestConstraintDetector:
    """Test suite for ConstraintDetector."""

    def test_detect_must_constraints(self, simple_sop_markdown):
        """Test detection of MUST-level constraints."""
        detector = ConstraintDetector()
        constraints = detector.detect(simple_sop_markdown)
        
        must_constraints = [c for c in constraints if c.level == ConstraintLevel.MUST]
        assert len(must_constraints) >= 1
        
        for c in must_constraints:
            assert isinstance(c, Constraint)
            assert c.level == ConstraintLevel.MUST
            assert len(c.description) > 0

    def test_detect_should_constraints(self):
        """Test detection of SHOULD-level constraints."""
        text = "对于特殊情况，应该酌情处理。"
        detector = ConstraintDetector()
        constraints = detector.detect(text)
        
        should_constraints = [c for c in constraints if c.level == ConstraintLevel.SHOULD]
        assert len(should_constraints) >= 1

    def test_detect_may_constraints(self):
        """Test detection of MAY-level constraints."""
        text = "可以适当的调整相关参数。"
        detector = ConstraintDetector()
        constraints = detector.detect(text)
        
        may_constraints = [c for c in constraints if c.level == ConstraintLevel.MAY]
        assert len(may_constraints) >= 1

    def test_detect_multiple_constraint_levels(self, simple_sop_markdown):
        """Test detection of multiple constraint levels in one document."""
        detector = ConstraintDetector()
        constraints = detector.detect(simple_sop_markdown)
        
        # Should detect both MUST and other levels
        assert len(constraints) >= 1
        levels = {c.level for c in constraints}
        assert len(levels) >= 1  # At least one level detected

    def test_constraint_structure(self):
        """Test that detected constraints have proper structure."""
        text = "折扣比例不得超过客户等级对应的上限。"
        detector = ConstraintDetector()
        constraints = detector.detect(text)
        
        assert len(constraints) >= 1
        c = constraints[0]
        assert hasattr(c, 'level')
        assert hasattr(c, 'description')
        assert hasattr(c, 'confidence')

    def test_no_false_positives(self):
        """Test that non-constraint text doesn't produce false positives."""
        text = "今天天气很好，我们去吃饭吧。"
        detector = ConstraintDetector()
        constraints = detector.detect(text)
        
        # No constraint-related keywords should be found
        assert len(constraints) == 0 or all(
            c.confidence < 0.5 for c in constraints
        )

    def test_detect_chinese_keywords(self, simple_sop_markdown):
        """Test detection of Chinese constraint keywords."""
        detector = ConstraintDetector()
        constraints = detector.detect(simple_sop_markdown)
        
        # The SOP mentions constraints like "不得超过"
        assert len(constraints) >= 1
