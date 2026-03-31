"""Rule Extractor - integrates all extractors."""
import re
from typing import List, Union, Dict, Any
from scripts.models import ExtractedRules, Constraint, DecisionTable, DecisionRule
from scripts.extractor.constraint_detector import ConstraintDetector
from scripts.extractor.decision_detector import DecisionDetector
from scripts.extractor.role_detector import RoleDetector
from scripts.extractor.boundary_detector import BoundaryDetector


class RuleExtractor:
    """Main extractor that combines all sub-detectors.
    
    Integrates constraint detection, decision detection, and role detection
    into a single unified extraction process.
    """
    
    def __init__(self):
        """Initialize the RuleExtractor with sub-detectors."""
        self.constraint_detector = ConstraintDetector()
        self.decision_detector = DecisionDetector()
        self.role_detector = RoleDetector()
        self.boundary_detector = BoundaryDetector()
    
    def _preprocess_text(self, text: str) -> str:
        """Remove markdown formatting from text.
        
        Args:
            text: Raw text with potential markdown formatting.
            
        Returns:
            Cleaned text with markdown formatting removed.
        """
        import re
        # Remove bold markers: **text** -> text
        text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
        # Remove italic markers: *text* -> text
        text = re.sub(r'\*(.+?)\*', r'\1', text)
        # Remove code markers: `code` -> code
        text = re.sub(r'`(.+?)`', r'\1', text)
        # Remove link markers: [text](url) -> text
        text = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', text)
        return text
    
    def extract(self, text: str) -> ExtractedRules:
        """Extract all rules from the given text.
        
        Args:
            text: SOP text to analyze.
            
        Returns:
            ExtractedRules containing all detected rules.
        """
        # Preprocess text: remove markdown formatting
        text = self._preprocess_text(text)
        
        # Extract constraints (now includes condition/action/roles from if-then patterns)
        constraints = self.constraint_detector.detect(text)
        
        # Extract decisions
        decisions = self.decision_detector.detect(text)
        
        # Separate DecisionTable and DecisionRule objects
        decision_tables: List[DecisionTable] = []
        decision_rules: List[DecisionRule] = []
        
        for d in decisions:
            if isinstance(d, DecisionTable):
                decision_tables.append(d)
            elif isinstance(d, DecisionRule):
                decision_rules.append(d)
        
        # Convert DecisionRules to DecisionTables
        if decision_rules:
            rule_based_table = self._convert_rules_to_table(decision_rules)
            decision_tables.append(rule_based_table)
        
        # Extract roles
        roles = self.role_detector.detect(text)
        
        # Enhance constraint roles from constraint_detector results
        roles = self._merge_constraint_roles(constraints, roles)
        
        # Extract boundary parameters
        boundaries = self.boundary_detector.detect(text)
        
        # Create ExtractedRules
        extracted = ExtractedRules(
            constraints=constraints,
            decisions=decision_tables,
            roles=roles,
            boundaries=boundaries,
            subjective_judgments=[],  # Could be extended to detect subjective items
            ambiguity_notes=[]  # Could be extended to detect ambiguity
        )
        
        return extracted
    
    def _convert_rules_to_table(self, rules: List[DecisionRule]) -> DecisionTable:
        """Convert a list of DecisionRules to a single DecisionTable.
        
        Args:
            rules: List of DecisionRule objects.
            
        Returns:
            DecisionTable containing all rules.
        """
        # Infer input/output vars from the rules
        input_vars = set()
        output_vars = set()
        
        for rule in rules:
            for k, v in rule.when.items():
                if k not in ('condition', 'when'):
                    input_vars.add(k)
            for k, v in rule.then.items():
                if k not in ('action', 'then'):
                    output_vars.add(k)
        
        # If no structured vars, use generic names
        if not input_vars:
            input_vars.add('condition')
        if not output_vars:
            output_vars.add('action')
        
        return DecisionTable(
            id="decision_table_if_then",
            name="If-Then Decision Rules",
            input_vars=sorted(list(input_vars)),
            output_vars=sorted(list(output_vars)),
            rules=rules
        )
    
    def _merge_constraint_roles(self, constraints: List[Constraint], existing_roles: Dict) -> Dict:
        """Merge roles extracted from constraints into existing roles dict.
        
        Args:
            constraints: List of constraints with roles.
            existing_roles: Existing roles from RoleDetector.
            
        Returns:
            Merged roles dictionary.
        """
        for constraint in constraints:
            for role in constraint.roles:
                if role and role not in existing_roles:
                    existing_roles[role] = {
                        'description': f"角色（从约束 {constraint.id} 中提取）",
                        'mentions': '1',
                        'source': f'constraint_{constraint.id}'
                    }
                elif role and role in existing_roles:
                    # Increment mention count
                    if 'mentions' in existing_roles[role]:
                        try:
                            existing_roles[role]['mentions'] = str(
                                int(existing_roles[role]['mentions']) + 1
                            )
                        except ValueError:
                            existing_roles[role]['mentions'] = '2'
        
        return existing_roles
