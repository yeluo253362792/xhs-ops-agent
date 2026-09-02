import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Integer, Index
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class PublishTaskImage(Base):
    __tablename__ = "publish_task_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("publish_tasks.id", ondelete="CASCADE"), nullable=True)

    upload_id = Column(String(255), nullable=False, index=True)
    storage_key = Column(String(500), nullable=False)
    filename = Column(String(255), nullable=False)
    mime_type = Column(String(100))
    size = Column(Integer)
    is_cover = Column(Boolean, default=False)
    token_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    downloaded_at = Column(DateTime)

    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_publish_task_images_task", "task_id"),
        Index("idx_publish_task_images_upload", "upload_id"),
        Index("idx_publish_task_images_expires", "expires_at"),
    )
