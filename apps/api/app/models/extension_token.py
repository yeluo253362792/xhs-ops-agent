import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class ExtensionToken(Base):
    __tablename__ = "extension_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    token_hash = Column(String(255), nullable=False, unique=True, index=True)
    device_info = Column(String(255))
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime)

    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_extension_tokens_user", "user_id"),
    )
