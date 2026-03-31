"""Constraint Detector - detects must/should/may constraints with condition/action extraction."""
import re
from typing import List, Optional, Tuple
from scripts.models import Constraint, ConstraintLevel, ConstraintType


class ConstraintDetector:
    """Detects constraint patterns in SOP text.
    
    Identifies MUST, SHOULD, and MAY level constraints based on
    Chinese and English keyword patterns. Extracts condition and action
    from compound constraints.
    """
    
    # Chinese keywords mapped to constraint levels
    CHINESE_MUST_PATTERNS = [
        r'必须', r'应当', r'需要', r'不得', r'严禁', r'不准',
        r'不得超过', r'不得少于', r'必须遵守'
    ]
    
    CHINESE_SHOULD_PATTERNS = [
        r'建议', r'推荐', r'应该', r'宜', r'可以考虑', r'一般应该', r'通常应当'
    ]
    
    CHINESE_MAY_PATTERNS = [
        r'可以', r'允许', r'酌情', r'根据情况', r'视情况'
    ]
    
    # English keywords
    ENGLISH_MUST_PATTERNS = [
        r'\bmust\b', r'\bshall\b', r'\bmust not\b', r'\bshall not\b'
    ]
    
    ENGLISH_SHOULD_PATTERNS = [
        r'\bshould\b', r'\bshould not\b', r'\brecommended\b'
    ]
    
    ENGLISH_MAY_PATTERNS = [
        r'\bmay\b', r'\bmay not\b', r'\bpermitted\b'
    ]
    
    # Role patterns
    ROLE_PATTERNS = [
        r'数据录入员', r'DMC', r'QA', r'DM', r'数据经理', r'项目经理',
        r'医学监查员', r'统计师', r'质量保证', r'伦理委员会',
        r'总经理', r'经理', r'总监', r'主管', r'专员',
        r'销售员', r'采购员', r'财务', r'系统管理员', r'管理员',
        r'操作员', r'审批人', r'审核人', r'复核人', r'申办方',
    ]
    
    def detect(self, text: str) -> List[Constraint]:
        """Detect constraints in the given text.
        
        Args:
            text: SOP text to analyze.
            
        Returns:
            List of detected Constraint objects with condition/action/roles.
        """
        constraints = []
        counter = 1
        
        # Split text into sentences
        sentences = self._split_into_sentences(text)
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence or len(sentence) < 5:
                continue
            
            # Try to detect if-then pattern first
            constraint = self._try_if_then_pattern(sentence)
            if constraint:
                constraint.id = f"C{counter:03d}"
                constraints.append(constraint)
                counter += 1
                continue
            
            # Try to detect standalone constraint keyword
            constraint = self._try_standalone_constraint(sentence)
            if constraint:
                constraint.id = f"C{counter:03d}"
                constraints.append(constraint)
                counter += 1
        
        return constraints
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences.
        
        Args:
            text: Text to split.
            
        Returns:
            List of sentences.
        """
        # Split by sentence endings
        sentences = re.split(r'[。\n]', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _try_if_then_pattern(self, sentence: str) -> Optional[Constraint]:
        """Try to detect if-then pattern in a sentence.
        
        Args:
            sentence: Sentence to check.
            
        Returns:
            Constraint if pattern detected, None otherwise.
        """
        sentence_lower = sentence.lower()
        
        # Chinese if-then patterns
        if '如果' in sentence and '，则' in sentence:
            # Pattern: 如果 [condition]，则 [action]
            match = re.search(r'如果\s+(.+?)，则\s+(.+?)$', sentence)
            if match:
                condition = match.group(1).strip()
                action = match.group(2).strip()
                
                if len(condition) < 2 or len(action) < 2:
                    return None
                
                # Detect level from action
                level = self._detect_level_in_text(action)
                roles = self._extract_roles(f"{condition} {action}")
                
                return Constraint(
                    id="",
                    level=level,
                    description=f"如果 {condition}，则 {action}",
                    condition=condition,
                    action=action,
                    roles=roles,
                    confidence=0.9,
                    source_quote=sentence
                )
        
        if '若' in sentence and '，则' in sentence:
            match = re.search(r'若\s+(.+?)，则\s+(.+?)$', sentence)
            if match:
                condition = match.group(1).strip()
                action = match.group(2).strip()
                
                if len(condition) < 2 or len(action) < 2:
                    return None
                
                level = self._detect_level_in_text(action)
                roles = self._extract_roles(f"{condition} {action}")
                
                return Constraint(
                    id="",
                    level=level,
                    description=f"若 {condition}，则 {action}",
                    condition=condition,
                    action=action,
                    roles=roles,
                    confidence=0.9,
                    source_quote=sentence
                )
        
        if '当' in sentence and '时' in sentence and '则' in sentence:
            match = re.search(r'当\s+(.+?)时\s+(.+?)$', sentence)
            if match:
                condition = match.group(1).strip()
                action = match.group(2).strip()
                
                if len(condition) < 2 or len(action) < 2:
                    return None
                
                level = self._detect_level_in_text(action)
                roles = self._extract_roles(f"{condition} {action}")
                
                return Constraint(
                    id="",
                    level=level,
                    description=f"当 {condition}时，{action}",
                    condition=condition,
                    action=action,
                    roles=roles,
                    confidence=0.9,
                    source_quote=sentence
                )
        
        # English if-then pattern
        if re.search(r'\bif\s+.+?,\s+then\s+', sentence, re.IGNORECASE):
            match = re.search(r'if\s+(.+?),\s+then\s+(.+?)$', sentence, re.IGNORECASE)
            if match:
                condition = match.group(1).strip()
                action = match.group(2).strip()
                
                if len(condition) < 2 or len(action) < 2:
                    return None
                
                level = self._detect_level_in_text(action)
                roles = self._extract_roles(f"{condition} {action}")
                
                return Constraint(
                    id="",
                    level=level,
                    description=f"if {condition}, then {action}",
                    condition=condition,
                    action=action,
                    roles=roles,
                    confidence=0.9,
                    source_quote=sentence
                )
        
        return None
    
    def _try_standalone_constraint(self, sentence: str) -> Optional[Constraint]:
        """Try to detect standalone constraint keyword in a sentence.
        
        Args:
            sentence: Sentence to check.
            
        Returns:
            Constraint if pattern detected, None otherwise.
        """
        sentence_lower = sentence.lower()
        
        # Check for constraint level keywords
        level = None
        level_patterns = []
        
        # MUST patterns
        for p in self.CHINESE_MUST_PATTERNS + self.ENGLISH_MUST_PATTERNS:
            if re.search(p, sentence_lower):
                level = ConstraintLevel.MUST
                level_patterns = self.CHINESE_MUST_PATTERNS + self.ENGLISH_MUST_PATTERNS
                break
        
        # SHOULD patterns
        if level is None:
            for p in self.CHINESE_SHOULD_PATTERNS + self.ENGLISH_SHOULD_PATTERNS:
                if re.search(p, sentence_lower):
                    level = ConstraintLevel.SHOULD
                    level_patterns = self.CHINESE_SHOULD_PATTERNS + self.ENGLISH_SHOULD_PATTERNS
                    break
        
        # MAY patterns
        if level is None:
            for p in self.CHINESE_MAY_PATTERNS + self.ENGLISH_MAY_PATTERNS:
                if re.search(p, sentence_lower):
                    level = ConstraintLevel.MAY
                    level_patterns = self.CHINESE_MAY_PATTERNS + self.ENGLISH_MAY_PATTERNS
                    break
        
        if level is None:
            return None
        
        # Extract roles
        roles = self._extract_roles(sentence)
        
        # Clean up the description (remove list markers)
        description = sentence
        if description.startswith('- '):
            description = description[2:]
        elif description.startswith('* '):
            description = description[2:]
        
        confidence = 0.85 if level == ConstraintLevel.MUST else 0.75
        
        return Constraint(
            id="",
            level=level,
            description=description,
            condition=None,
            action=None,
            roles=roles,
            confidence=confidence,
            source_quote=sentence
        )
    
    def _detect_level_in_text(self, text: str) -> ConstraintLevel:
        """Detect constraint level from text content.
        
        Args:
            text: Text to analyze.
            
        Returns:
            Detected constraint level.
        """
        text_lower = text.lower()
        
        must_indicators = ['必须', '应当', '需要', '不得', '严禁', 'must', 'shall']
        should_indicators = ['建议', '推荐', '应该', 'should', 'recommended']
        may_indicators = ['可以', '允许', 'may', 'permitted']
        
        for indicator in must_indicators:
            if indicator in text_lower:
                return ConstraintLevel.MUST
        for indicator in should_indicators:
            if indicator in text_lower:
                return ConstraintLevel.SHOULD
        for indicator in may_indicators:
            if indicator in text_lower:
                return ConstraintLevel.MAY
        
        return ConstraintLevel.MUST
    
    def _extract_roles(self, text: str) -> List[str]:
        """Extract role mentions from text.
        
        Args:
            text: Text to search.
            
        Returns:
            List of role names found.
        """
        roles = []
        seen = set()
        
        for role_pattern in self.ROLE_PATTERNS:
            match = re.search(role_pattern, text)
            if match:
                role = match.group()
                if role not in seen:
                    seen.add(role)
                    roles.append(role)
        
        return roles
