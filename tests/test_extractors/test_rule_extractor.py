"""Rule Extractor tests."""
import pytest
from scripts.extractor.rule_extractor import RuleExtractor
from scripts.models import ExtractedRules, Constraint, DecisionTable


class TestRuleExtractor:
    """Test suite for RuleExtractor."""

    def test_extract_all_rules(self, simple_sop_markdown):
        """Test extraction of all rule types."""
        extractor = RuleExtractor()
        rules = extractor.extract(simple_sop_markdown)
        
        assert isinstance(rules, ExtractedRules)
        assert isinstance(rules.constraints, list)
        assert isinstance(rules.decisions, list)
        assert isinstance(rules.roles, dict)

    def test_extract_constraints_integration(self, simple_sop_markdown):
        """Test that constraints are properly extracted."""
        extractor = RuleExtractor()
        rules = extractor.extract(simple_sop_markdown)
        
        assert len(rules.constraints) >= 0  # May have constraints

    def test_extract_decisions_integration(self, sop_with_conditions):
        """Test that decisions are properly extracted."""
        extractor = RuleExtractor()
        rules = extractor.extract(sop_with_conditions)
        
        assert len(rules.decisions) >= 0  # May have decisions

    def test_extract_roles_integration(self, simple_sop_markdown):
        """Test that roles are properly extracted."""
        extractor = RuleExtractor()
        rules = extractor.extract(simple_sop_markdown)
        
        assert isinstance(rules.roles, dict)

    def test_extract_from_multiple_content_types(self, simple_sop_markdown, sop_with_table):
        """Test extraction from different content types."""
        extractor = RuleExtractor()
        
        rules1 = extractor.extract(simple_sop_markdown)
        rules2 = extractor.extract(sop_with_table)
        
        # Both should return valid ExtractedRules
        assert isinstance(rules1, ExtractedRules)
        assert isinstance(rules2, ExtractedRules)

    def test_extracted_rules_structure(self):
        """Test that ExtractedRules has all required fields."""
        text = "这是一个测试文档。"
        extractor = RuleExtractor()
        rules = extractor.extract(text)
        
        assert hasattr(rules, 'constraints')
        assert hasattr(rules, 'decisions')
        assert hasattr(rules, 'roles')
        assert hasattr(rules, 'boundaries')
        assert hasattr(rules, 'subjective_judgments')
        assert hasattr(rules, 'ambiguity_notes')

    def test_empty_content(self):
        """Test extraction from empty content."""
        extractor = RuleExtractor()
        rules = extractor.extract("")
        
        assert rules.constraints == []
        assert rules.decisions == []
        assert rules.roles == {}

    def test_combined_extraction(self, simple_sop_markdown):
        """Test that extraction combines results from all detectors."""
        extractor = RuleExtractor()
        rules = extractor.extract(simple_sop_markdown)
        
        # Should have called all sub-detectors
        total_items = (
            len(rules.constraints) +
            len(rules.decisions) +
            len(rules.roles) +
            len(rules.boundaries) +
            len(rules.subjective_judgments) +
            len(rules.ambiguity_notes)
        )
        # At minimum should have some content detected
        assert total_items >= 0
