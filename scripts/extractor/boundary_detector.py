"""Boundary Parameter Detector - extracts quantitative boundaries from SOP text."""
import re
from typing import List, Dict, Optional
from scripts.models import BoundaryParameter


class BoundaryDetector:
    """Detects and extracts boundary parameters from SOP text.
    
    Extracts quantitative boundaries such as:
    - Time limits (24 hours, 3 business days)
    - Amount limits (up to 100,000)
    - Percentage ranges (5-10%)
    - Count limits (max 5 items)
    """
    
    # Time unit patterns
    TIME_PATTERNS = [
        # 24小时内, 3个工作日内 (support optional space)
        (r'(\d+(?:\.\d+)?)\s*个?\s*工作日', '工作日', 'max'),
        (r'(\d+(?:\.\d+)?)\s*小时\s*(?:内)?', '小时', 'max'),
        (r'(\d+(?:\.\d+)?)\s*天内', '天', 'max'),
        (r'(\d+(?:\.\d+)?)\s*日内', '天', 'max'),
        (r'(\d+(?:\.\d+)?)\s*天后', '天', 'min'),
        (r'(\d+(?:\.\d+)?)\s*周', '周', None),
        (r'(\d+(?:\.\d+)?)\s*个月', '月', None),
        (r'(\d+(?:\.\d+)?)\s*年', '年', None),
        # English patterns
        (r'(\d+(?:\.\d+)?)\s*(?:business\s+)?days?\s*(?:within)?', 'days', None),
        (r'(\d+(?:\.\d+)?)\s*hours?\s*(?:within)?', 'hours', None),
        (r'(\d+(?:\.\d+)?)\s*weeks?', 'weeks', None),
    ]
    
    # Percentage patterns
    PERCENTAGE_PATTERNS = [
        # 5-10%, 10%以上, 不超过20%
        (r'(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*%', 'percent', 'range'),
        (r'不超过\s*(\d+(?:\.\d+)?)\s*%', 'percent', 'max'),
        (r'不低于\s*(\d+(?:\.\d+)?)\s*%', 'percent', 'min'),
        (r'(\d+(?:\.\d+)?)\s*%', 'percent', None),
        (r'(\d+(?:\.\d+)?)\s*以上', 'percent', 'min'),
        (r'(\d+(?:\.\d+)?)\s*以下', 'percent', 'max'),
    ]
    
    # Amount patterns
    AMOUNT_PATTERNS = [
        # 10万以内, 50万以上, 100-500万
        (r'(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:万|千|百|元)', 'amount', 'range'),
        (r'(?:超过|高于|不低于)\s*(\d+(?:\.\d+)?)\s*(?:万|千|百|元)', 'amount', 'min'),
        (r'(?:不超过|低于|不超过)\s*(\d+(?:\.\d+)?)\s*(?:万|千|百|元)', 'amount', 'max'),
        (r'(\d+(?:\.\d+)?)\s*(?:万|千|百|元)', 'amount', None),
    ]
    
    # Count patterns - must be preceded by explicit count keywords
    COUNT_PATTERNS = [
        # 最多5项, 不少于3次, 不超过10个
        (r'(?:最多|最少|不少于|不超过|至少|至多)\s*(\d+)\s*(?:个|项|次|条|份|页|行)', 'count', None),
    ]
    
    def detect(self, text: str) -> Dict[str, BoundaryParameter]:
        """Detect boundary parameters in text.
        
        Args:
            text: SOP text to analyze.
            
        Returns:
            Dictionary mapping parameter names to BoundaryParameter objects.
        """
        boundaries: Dict[str, BoundaryParameter] = {}
        
        # Detect time boundaries
        time_boundaries = self._detect_time_boundaries(text)
        boundaries.update(time_boundaries)
        
        # Detect percentage boundaries
        pct_boundaries = self._detect_percentage_boundaries(text)
        for name, bp in pct_boundaries.items():
            if name not in boundaries or self._is_better_boundary(boundaries[name], bp):
                boundaries[name] = bp
        
        # Detect amount boundaries
        amount_boundaries = self._detect_amount_boundaries(text)
        for name, bp in amount_boundaries.items():
            if name not in boundaries or self._is_better_boundary(boundaries[name], bp):
                boundaries[name] = bp
        
        # Detect count boundaries
        count_boundaries = self._detect_count_boundaries(text)
        for name, bp in count_boundaries.items():
            if name not in boundaries or self._is_better_boundary(boundaries[name], bp):
                boundaries[name] = bp
        
        return boundaries
    
    def _detect_time_boundaries(self, text: str) -> Dict[str, BoundaryParameter]:
        """Detect time-related boundaries."""
        boundaries = {}
        
        for pattern, unit, limit_type in self.TIME_PATTERNS:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                value = float(match.group(1))
                
                # Get surrounding context for limit type detection
                context_start = max(0, match.start() - 10)
                context_end = min(len(text), match.end() + 10)
                context = text[context_start:context_end]
                
                # Determine if this is a max, min, or exact value
                detected_limit_type = limit_type
                if '超过' in context or '超过' in text or '以上' in text or '后' in context:
                    detected_limit_type = 'max'  # "24小时后" means max 24 hours
                elif '不超过' in context or '以内' in context or '内' in context:
                    detected_limit_type = 'max'
                
                # Create unique key for this unit type
                key = f"时间限制_{unit}"
                
                # Create boundary parameter
                bp = BoundaryParameter(
                    name=f"时间限制_{unit}",
                    unit=unit,
                    confidence=0.85
                )
                
                if detected_limit_type == 'max':
                    bp.max_value = value
                elif detected_limit_type == 'min':
                    bp.min_value = value
                else:
                    bp.default_value = value
                
                # Only add if not already present, or if this is more specific
                if key not in boundaries:
                    boundaries[key] = bp
        
        return boundaries
    
    def _detect_percentage_boundaries(self, text: str) -> Dict[str, BoundaryParameter]:
        """Detect percentage-related boundaries."""
        boundaries = {}
        
        for pattern, unit, limit_type in self.PERCENTAGE_PATTERNS:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                groups = match.groups()
                
                if len(groups) == 2:  # Range pattern
                    min_val = float(groups[0])
                    max_val = float(groups[1])
                    bp = BoundaryParameter(
                        name="百分比范围",
                        min_value=min_val,
                        max_value=max_val,
                        unit="%",
                        confidence=0.9
                    )
                else:  # Single value pattern
                    value = float(groups[0])
                    bp = BoundaryParameter(
                        name="百分比",
                        unit="%",
                        confidence=0.85
                    )
                    
                    if limit_type == 'max' or '不超过' in text or '以下' in text:
                        bp.max_value = value
                    elif limit_type == 'min' or '不低于' in text or '以上' in text:
                        bp.min_value = value
                    else:
                        bp.default_value = value
                
                boundaries['百分比限制'] = bp
        
        return boundaries
    
    def _detect_amount_boundaries(self, text: str) -> Dict[str, BoundaryParameter]:
        """Detect amount-related boundaries."""
        boundaries = {}
        
        for pattern, unit, limit_type in self.AMOUNT_PATTERNS:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                groups = match.groups()
                
                if len(groups) == 2:  # Range pattern
                    min_val = float(groups[0])
                    max_val = float(groups[1])
                    bp = BoundaryParameter(
                        name="金额范围",
                        min_value=min_val,
                        max_value=max_val,
                        unit=unit,
                        confidence=0.9
                    )
                else:  # Single value pattern
                    value = float(groups[0])
                    bp = BoundaryParameter(
                        name="金额限制",
                        unit=unit,
                        confidence=0.85
                    )
                    
                    if '超过' in text or '高于' in text or '以上' in text:
                        bp.min_value = value
                    elif '不超过' in text or '低于' in text or '以内' in text:
                        bp.max_value = value
                    else:
                        bp.default_value = value
                
                boundaries['金额限制'] = bp
        
        return boundaries
    
    def _detect_count_boundaries(self, text: str) -> Dict[str, BoundaryParameter]:
        """Detect count-related boundaries."""
        boundaries = {}
        
        for pattern, unit, limit_type in self.COUNT_PATTERNS:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                value = float(match.group(1))
                
                # Determine limit type from context
                if '最多' in text or '不超过' in text:
                    limit_type = 'max'
                elif '最少' in text or '不少于' in text:
                    limit_type = 'min'
                
                bp = BoundaryParameter(
                    name="数量限制",
                    unit=unit,
                    confidence=0.85
                )
                
                if limit_type == 'max':
                    bp.max_value = value
                elif limit_type == 'min':
                    bp.min_value = value
                else:
                    bp.default_value = value
                
                if '数量' not in boundaries:
                    boundaries['数量限制'] = bp
        
        return boundaries
    
    def _is_better_boundary(self, existing: BoundaryParameter, new: BoundaryParameter) -> bool:
        """Determine if a new boundary is better than an existing one."""
        # Prefer boundaries with both min and max (range) over single values
        existing_has_range = existing.min_value is not None and existing.max_value is not None
        new_has_range = new.min_value is not None and new.max_value is not None
        
        if new_has_range and not existing_has_range:
            return True
        if existing_has_range and not new_has_range:
            return False
        
        # Prefer higher confidence
        if new.confidence > existing.confidence:
            return True
        
        return False
