import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class GenerationHistory(Base):
    __tablename__ = "generation_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    topic = Column(String(255), nullable=False)
    audience = Column(String(255), nullable=False)
    content_type = Column(String(50), nullable=False)
    tone = Column(String(50), nullable=True)
    generated_content = Column(JSON, nullable=False)
    compliance_result = Column(JSON, nullable=True)
    is_favorite = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
