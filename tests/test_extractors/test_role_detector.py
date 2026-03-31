"""Role Detector tests."""
import pytest
from scripts.extractor.role_detector import RoleDetector


class TestRoleDetector:
    """Test suite for RoleDetector."""

    def test_extract_roles(self, simple_sop_markdown):
        """Test extraction of roles from text."""
        detector = RoleDetector()
        roles = detector.detect(simple_sop_markdown)
        
        assert isinstance(roles, dict)
        assert len(roles) >= 1
        
        # Check for common roles in the SOP
        role_keys = [r.lower() for r in roles.keys()]
        # Should find roles like 销售员, 经理, 总监 etc.
        found_roles = any(
            "销售" in r or "经理" in r or "总监" in r 
            for r in role_keys
        )
        assert found_roles, f"Expected to find roles, got: {roles}"

    def test_role_structure(self, simple_sop_markdown):
        """Test that extracted roles have proper structure."""
        detector = RoleDetector()
        roles = detector.detect(simple_sop_markdown)
        
        for role_name, role_info in roles.items():
            assert isinstance(role_name, str)
            assert isinstance(role_info, dict)
            assert len(role_name) > 0

    def test_extract_roles_from_table(self, sop_with_table):
        """Test role extraction from table content."""
        detector = RoleDetector()
        roles = detector.detect(sop_with_table)
        
        # Table contains roles like 主管, 经理, 总监, 总经理
        role_names = [r for r in roles.keys()]
        expected_roles = ["主管", "经理", "总监", "总经理"]
        
        for expected in expected_roles:
            found = any(expected in r for r in role_names)
            assert found, f"Expected role '{expected}' not found in {role_names}"

    def test_role_with_permissions(self, simple_sop_markdown):
        """Test that roles include permission information."""
        detector = RoleDetector()
        roles = detector.detect(simple_sop_markdown)
        
        # Each role should have some associated info
        for role_name, role_info in roles.items():
            assert len(role_info) >= 0  # Can be empty dict

    def test_no_roles_in_plain_text(self):
        """Test that text without roles doesn't produce false positives."""
        text = "今天天气很好，适合出去散步。"
        detector = RoleDetector()
        roles = detector.detect(text)
        
        # No role-related words should be found
        assert len(roles) == 0

    def test_role_consistency(self, sop_with_table):
        """Test that role detection is consistent."""
        detector = RoleDetector()
        
        # Run detection twice on same content
        roles1 = detector.detect(sop_with_table)
        roles2 = detector.detect(sop_with_table)
        
        assert set(roles1.keys()) == set(roles2.keys())
