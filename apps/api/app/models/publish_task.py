import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, JSON, Index
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class PublishTask(Base):
    __tablename__ = "publish_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    generation_history_id = Column(UUID(as_uuid=True), ForeignKey("generation_history.id"), nullable=True)

    platform = Column(String(50), nullable=False, default="xiaohongshu")
    status = Column(String(50), nullable=False, default="pending")

    content = Column(JSON, nullable=False)
    images = Column(JSON, default=list)
    progress = Column(JSON, default=dict)
    logs = Column(JSON, default=list)

    publish_token_hash = Column(String(255))
    publish_token_expires_at = Column(DateTime)

    published_at = Column(DateTime)
    cancelled_at = Column(DateTime)
    failed_at = Column(DateTime)
    is_deleted = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_publish_tasks_user_status", "user_id", "status"),
        Index("idx_publish_tasks_token", "publish_token_hash"),
        Index("idx_publish_tasks_expires", "publish_token_expires_at"),
    )
