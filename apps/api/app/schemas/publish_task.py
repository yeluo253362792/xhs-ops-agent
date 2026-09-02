from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class TaskContent(BaseModel):
    titles: list[str]
    selected_title: str
    body: str
    tags: list[str]
    cover_text: Optional[str] = None


class TaskImage(BaseModel):
    url: str
    filename: str
    mime_type: Optional[str] = None
    is_cover: bool = False


class TaskImageUpload(BaseModel):
    upload_id: str
    filename: str
    is_cover: bool = False


class PublishTaskCreate(BaseModel):
    content: TaskContent
    images: list[TaskImageUpload] = []
    platform: str = "xiaohongshu"
    note_type: str = "图文笔记"
    is_ai_generated: bool = True
    generation_history_id: Optional[UUID] = None


class PublishTaskUpdate(BaseModel):
    status: Optional[str] = None
    progress: Optional[dict[str, str]] = None
    logs: Optional[list[dict]] = None


class PublishTaskOut(BaseModel):
    id: UUID
    status: str
    platform: str
    content: TaskContent
    images: list[TaskImage]
    is_ai_generated: bool
    progress: dict
    logs: list
    publish_token: Optional[str] = None
    publish_token_expires_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PublishTaskListOut(BaseModel):
    id: UUID
    status: str
    platform: str
    note_type: str
    content: TaskContent
    images_count: int
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PendingTasksOut(BaseModel):
    tasks: list[PublishTaskOut]


class ImageUploadOut(BaseModel):
    upload_id: str
    filename: str
    mime_type: Optional[str]
    size: int
    url: str
    is_cover: bool = False


class ImageUploadResponse(BaseModel):
    uploaded: list[ImageUploadOut]
    expires_at: datetime


class TaskLogEntry(BaseModel):
    time: datetime
    level: str
    message: str


class ExtensionLogReport(BaseModel):
    level: str
    message: str
    context: Optional[dict] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
