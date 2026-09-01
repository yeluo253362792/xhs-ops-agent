import re
from typing import List, Dict, Any

from app.schemas.generation import ComplianceResult


# 敏感词/规则库（MVP 简化版，后续可维护到数据库）
SENSITIVE_RULES = [
    {"pattern": r"第一|最好|最强|全网唯一|顶级|绝对", "level": "medium", "category": "极限词", "suggestion": "避免使用绝对化用语，可替换为「很不错」"},
    {"pattern": r"根治|祛斑|美白|减肥|祛痘|治疗|疗效|医生推荐", "level": "high", "category": "医疗功效", "suggestion": "医疗/功效类描述风险高，请删除或改为个人体验描述"},
    {"pattern": r"稳赚|保本|0风险|收益率|保收益", "level": "high", "category": "金融投资", "suggestion": "避免收益承诺，删除相关表述"},
    {"pattern": r"微信|VX|手机号|二维码|外链|加群", "level": "medium", "category": "外部导流", "suggestion": "避免外部导流，删除联系方式"},
    {"pattern": r"包过|保录取|学历提升|包拿证", "level": "high", "category": "教育承诺", "suggestion": "避免资质/结果承诺"},
]


def check_compliance(text: str) -> ComplianceResult:
    """检测文本合规性。"""
    issues: List[str] = []
    suggestions: List[str] = []
    max_level = "low"

    # 检测广告意图（简单规则）
    ad_signals = ["品牌", "价格", "优惠", "购买", "链接", "淘宝", "京东"]
    has_ad = any(signal in text for signal in ad_signals)
    if has_ad:
        issues.append("检测到潜在商业推广内容")
        suggestions.append("如涉及商业合作，建议在正文或评论区添加 #合作 / #赞助 声明")
        if max_level == "low":
            max_level = "medium"

    # 遍历规则库
    for rule in SENSITIVE_RULES:
        if re.search(rule["pattern"], text):
            issues.append(f"命中{rule['category']}规则：{rule['pattern']}")
            suggestions.append(rule["suggestion"])
            if rule["level"] == "high":
                max_level = "high"
            elif rule["level"] == "medium" and max_level == "low":
                max_level = "medium"

    if not issues:
        issues.append("未检测到明显违规内容")
        suggestions.append("内容合规，可放心发布")

    return ComplianceResult(level=max_level, issues=issues, suggestions=suggestions)


def check_content_compliance(content: Dict[str, Any]) -> ComplianceResult:
    """检测生成内容的整体合规性。"""
    text_parts = []
    text_parts.append(content.get("body", ""))
    text_parts.extend(content.get("titles", []))
    text_parts.append(content.get("cover_text", ""))
    for item in content.get("image_script", []):
        text_parts.append(item.get("text", ""))
    full_text = " ".join(text_parts)
    return check_compliance(full_text)
