"""Decision Detector - detects conditional patterns and decision tables."""
import re
from typing import List, Union
from scripts.models import DecisionTable, DecisionRule


class DecisionDetector:
    """Detects decision patterns in SOP text.
    
    Identifies if-then patterns, when-then patterns, and converts
    markdown tables into decision tables.
    """
    
    IF_THEN_PATTERNS = [
        # Chinese patterns
        (r'如果(.+?)，则(.+?)[。\n]', 'if_then'),
        (r'若(.+?)，则(.+?)[。\n]', 'if_then'),
        (r'要是(.+?)，就(.+?)[。\n]', 'if_then'),
        # English patterns
        (r'if\s+(.+?),\s+then\s+(.+?)[.\n]', 'if_then'),
        (r'if\s+(.+?),\s+(.+?)[.\n]', 'if_then'),
    ]
    
    WHEN_THEN_PATTERNS = [
        # Chinese patterns
        (r'当(.+?)时，则(.+?)[。\n]', 'when_then'),
        (r'当(.+?)时(.+?)[。\n]', 'when_then'),
        # English patterns
        (r'when\s+(.+?),\s+then\s+(.+?)[.\n]', 'when_then'),
    ]
    
    def detect(self, text: str) -> List[Union[DecisionTable, DecisionRule]]:
        """Detect decision patterns in the given text.
        
        Args:
            text: SOP text to analyze.
            
        Returns:
            List of DecisionTable or DecisionRule objects.
        """
        decisions = []
        
        # Detect if-then patterns
        if_then_rules = self._detect_if_then(text)
        decisions.extend(if_then_rules)
        
        # Detect when-then patterns
        when_then_rules = self._detect_when_then(text)
        decisions.extend(when_then_rules)
        
        # Detect tables as decision tables
        decision_tables = self._detect_tables_as_decisions(text)
        decisions.extend(decision_tables)
        
        return decisions
    
    def _detect_if_then(self, text: str) -> List[DecisionRule]:
        """Detect if-then conditional patterns.
        
        Args:
            text: Text to search.
            
        Returns:
            List of DecisionRule objects.
        """
        rules = []
        
        for pattern, pattern_type in self.IF_THEN_PATTERNS:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                groups = match.groups()
                if len(groups) >= 2:
                    condition = groups[0].strip()
                    action = groups[1].strip()
                    
                    rule = DecisionRule(
                        when={'condition': condition},
                        then={'action': action}
                    )
                    rules.append(rule)
        
        return rules
    
    def _detect_when_then(self, text: str) -> List[DecisionRule]:
        """Detect when-then conditional patterns.
        
        Args:
            text: Text to search.
            
        Returns:
            List of DecisionRule objects.
        """
        rules = []
        
        for pattern, pattern_type in self.WHEN_THEN_PATTERNS:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                groups = match.groups()
                if len(groups) >= 2:
                    when_cond = groups[0].strip()
                    then_action = groups[1].strip()
                    
                    rule = DecisionRule(
                        when={'when': when_cond},
                        then={'then': then_action}
                    )
                    rules.append(rule)
        
        return rules
    
    def _detect_tables_as_decisions(self, text: str) -> List[DecisionTable]:
        """Detect markdown tables and convert them to decision tables.
        
        Args:
            text: Text containing markdown tables.
            
        Returns:
            List of DecisionTable objects.
        """
        tables = []
        
        # Find markdown tables
        table_pattern = r'(\|[^\n]+\|\n){2,}'
        for table_match in re.finditer(table_pattern, text):
            table_text = table_match.group()
            lines = table_text.strip().split('\n')
            
            if len(lines) < 2:
                continue
            
            # Parse table
            headers = self._parse_table_row(lines[0])
            
            # Skip separator line
            data_start = 1
            if '---' in lines[1] or ':--' in lines[1]:
                data_start = 2
            
            if len(headers) < 2 or len(lines) <= data_start:
                continue
            
            # Determine input/output columns
            input_vars = headers[:-1]
            output_vars = [headers[-1]]
            
            # Extract rules
            rules = []
            for i in range(data_start, len(lines)):
                row = self._parse_table_row(lines[i])
                if len(row) >= 2:
                    rule = DecisionRule(
                        when=dict(zip(input_vars, row[:-1])),
                        then={output_vars[0]: row[-1]}
                    )
                    rules.append(rule)
            
            if rules:
                table_id = f"decision_table_{len(tables) + 1}"
                table_name = f"Decision Table {len(tables) + 1}"
                
                decision_table = DecisionTable(
                    id=table_id,
                    name=table_name,
                    input_vars=input_vars,
                    output_vars=output_vars,
                    rules=rules
                )
                tables.append(decision_table)
        
        return tables
    
    def _parse_table_row(self, row: str) -> List[str]:
        """Parse a markdown table row.
        
        Args:
            row: Table row string.
            
        Returns:
            List of cell values.
        """
        row = row.strip('|')
        cells = row.split('|')
        return [cell.strip() for cell in cells]
