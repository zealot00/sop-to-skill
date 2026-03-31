"""Role Detector - extracts roles and their permissions from SOP text."""
import re
from typing import Dict, List


class RoleDetector:
    """Detects roles and their associated permissions in SOP text.
    
    Identifies role names and extracts associated permissions,
    approval limits, and other role-specific attributes.
    """
    
    # Common role patterns in Chinese SOPs
    ROLE_PATTERNS = [
        # Chinese roles
        r'(总经理|董事长|CEO|CFO|COO)\b',
        r'(副总监|副经理|副总经理)\b',
        r'(总监|经理|主管|负责人)\b',
        r'(组长|班组长|领班)\b',
        r'(专员|文员|助理)\b',
        r'(销售员|销售代表|业务员)\b',
        r'(采购员|采购代表)\b',
        r'(财务|会计|出纳)\b',
        r'(人事|HR|人力资源)\b',
        r'(技术员|工程师|技术专家)\b',
        r'(管理员|系统管理员)\b',
        r'(审批人|审核人|复核人)\b',
        # Generic role mentions
        r'角色[：:]\s*(\w+)',
        r'(\w+)[需需]要审批',
        r'(\w+)审批',
    ]
    
    # Permission-related keywords
    PERMISSION_PATTERNS = [
        r'(审批|审核|批准|同意|驳回)',
        r'(批准|授权|许可)',
        r'(审核|复核|审查)',
    ]
    
    # Amount/limit patterns
    AMOUNT_PATTERNS = [
        r'(\d+(?:\.\d+)?)\s*(万|千|百|元)',
        r'(无上限|无限额|不限)',
        r'(以上|以下|以内|以外)',
    ]
    
    def detect(self, text: str) -> Dict[str, Dict[str, str]]:
        """Detect roles in the given text.
        
        Args:
            text: SOP text to analyze.
            
        Returns:
            Dictionary mapping role names to their information dictionaries.
        """
        roles: Dict[str, Dict[str, str]] = {}
        
        # Find all role mentions
        found_roles = self._find_roles(text)
        
        # Group roles and extract associated information
        for role_name in found_roles:
            role_info = self._extract_role_info(text, role_name)
            roles[role_name] = role_info
        
        return roles
    
    def _find_roles(self, text: str) -> List[str]:
        """Find all role names mentioned in text.
        
        Args:
            text: Text to search.
            
        Returns:
            List of unique role names.
        """
        found = set()
        
        for pattern in self.ROLE_PATTERNS:
            for match in re.finditer(pattern, text):
                if match.groups():
                    # Handle groups (like "角色：销售员")
                    role_name = match.group(1) if match.group(1) else match.group(0)
                    found.add(role_name)
                else:
                    found.add(match.group(0))
        
        return list(found)
    
    def _extract_role_info(self, text: str, role_name: str) -> Dict[str, str]:
        """Extract information associated with a role.
        
        Args:
            text: Full text.
            role_name: Name of the role.
            
        Returns:
            Dictionary with role information.
        """
        info: Dict[str, str] = {}
        
        # Find sentences containing the role
        sentences = re.split(r'[。\n]', text)
        role_sentences = [s for s in sentences if role_name in s]
        
        if role_sentences:
            info['mentions'] = str(len(role_sentences))
            
            # Check for approval-related info
            for sentence in role_sentences:
                if any(kw in sentence for kw in ['审批', '审核', '批准']):
                    info['can_approve'] = 'true'
                    
                    # Extract any amounts mentioned
                    amount_match = re.search(r'(\d+(?:\.\d+)?)\s*(万|千|百|元)', sentence)
                    if amount_match:
                        info['approval_limit'] = amount_match.group(0)
                    elif '无上限' in sentence or '无限制' in sentence:
                        info['approval_limit'] = '无上限'
        
        return info
