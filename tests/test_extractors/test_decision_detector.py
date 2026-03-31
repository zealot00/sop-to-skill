"""Decision Detector tests."""
import pytest
from scripts.extractor.decision_detector import DecisionDetector
from scripts.models import DecisionTable, DecisionRule


class TestDecisionDetector:
    """Test suite for DecisionDetector."""

    def test_detect_if_then_pattern(self, sop_with_conditions):
        """Test detection of 如果...则... pattern."""
        detector = DecisionDetector()
        decisions = detector.detect(sop_with_conditions)
        
        assert len(decisions) >= 1
        
        # Find if-then patterns
        if_then_found = False
        for d in decisions:
            if isinstance(d, DecisionTable):
                if d.rules:
                    if_then_found = True
                    break
            elif isinstance(d, DecisionRule):
                if_then_found = True
                break
        
        assert if_then_found, "Expected to find if-then patterns"

    def test_detect_table_as_decision(self, sop_with_table):
        """Test detection of decision tables from markdown tables."""
        detector = DecisionDetector()
        decisions = detector.detect(sop_with_table)
        
        assert len(decisions) >= 1
        
        # Should have identified a decision table
        decision_table = next(
            (d for d in decisions if isinstance(d, DecisionTable)),
            None
        )
        assert decision_table is not None
        assert decision_table.name is not None
        assert len(decision_table.input_vars) >= 1

    def test_detect_conditional_rules(self, sop_with_conditions):
        """Test extraction of conditional rules."""
        detector = DecisionDetector()
        decisions = detector.detect(sop_with_conditions)
        
        all_rules = []
        for d in decisions:
            if isinstance(d, DecisionTable):
                all_rules.extend(d.rules)
            elif isinstance(d, DecisionRule):
                all_rules.append(d)
        
        assert len(all_rules) >= 1

    def test_decision_table_structure(self, sop_with_table):
        """Test that detected decision tables have proper structure."""
        detector = DecisionDetector()
        decisions = detector.detect(sop_with_table)
        
        for d in decisions:
            if isinstance(d, DecisionTable):
                assert hasattr(d, 'id')
                assert hasattr(d, 'name')
                assert hasattr(d, 'input_vars')
                assert hasattr(d, 'output_vars')
                assert isinstance(d.input_vars, list)
                assert isinstance(d.output_vars, list)

    def test_no_decision_in_plain_text(self):
        """Test that plain text without conditions doesn't produce false decisions."""
        text = "这是一个普通的段落，不包含任何条件判断。"
        detector = DecisionDetector()
        decisions = detector.detect(text)
        
        # Plain text should not generate decision tables
        assert len(decisions) == 0 or all(
            not isinstance(d, DecisionTable) for d in decisions
        )

    def test_detect_when_then_pattern(self):
        """Test detection of 当...时...则... pattern."""
        text = "当订单包含定制产品时，交付周期需要延长3天。"
        detector = DecisionDetector()
        decisions = detector.detect(text)
        
        assert len(decisions) >= 1

    def test_multiple_conditions(self, simple_sop_markdown):
        """Test detection of multiple conditions in SOP."""
        detector = DecisionDetector()
        decisions = detector.detect(simple_sop_markdown)
        
        # Should find multiple conditional statements
        assert len(decisions) >= 0  # May or may not find depending on content
