from typing import Optional, List
from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200)
    audience: str = Field(..., min_length=1, max_length=200)
    content_type: str = Field(..., pattern=r"^(干货收藏型|种草带货型|情绪共鸣型|争议讨论型|涨粉型)$")
    tone: Optional[str] = "亲切自然"
    extra_info: Optional[str] = None


class ImageScriptItem(BaseModel):
    content: str
    desc: str
    text: str


class ComplianceResult(BaseModel):
    level: str  # low / medium / high
    issues: List[str]
    suggestions: List[str]


class GeneratedContent(BaseModel):
    topic: str
    titles: List[str]
    body: str
    tags: List[str]
    cover_text: str
    cover_design: List[str]
    image_script: List[ImageScriptItem]
    publish_suggestions: List[str]


class GenerateResponse(BaseModel):
    success: bool
    data: Optional[GeneratedContent] = None
    compliance: Optional[ComplianceResult] = None
    error: Optional[str] = None
    remaining_quota: Optional[int] = None
