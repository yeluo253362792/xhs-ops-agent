from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class HistoryCreate(BaseModel):
    topic: str
    audience: str
    content_type: str
    tone: Optional[str] = None
    generated_content: dict
    compliance_result: Optional[dict] = None


class HistoryUpdate(BaseModel):
    is_favorite: Optional[bool] = None


class HistoryOut(BaseModel):
    id: UUID
    user_id: UUID
    topic: str
    audience: str
    content_type: str
    tone: Optional[str]
    generated_content: dict
    compliance_result: Optional[dict]
    is_favorite: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
