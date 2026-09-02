from typing import Optional
import hashlib
import secrets
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.extension_token import ExtensionToken


class ExtensionTokenService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _hash_token(self, token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    def _generate_token(self) -> str:
        return f"ext_{secrets.token_urlsafe(32)}"

    async def create(self, user_id: UUID, device_info: Optional[str] = None) -> tuple[str, datetime]:
        token = self._generate_token()
        token_hash = self._hash_token(token)
        expires_at = datetime.utcnow() + timedelta(seconds=settings.publish_token_ttl_seconds)

        # 吊销同一用户的旧 token（可选：保留多个设备）
        await self.revoke_all_by_user(user_id)

        ext_token = ExtensionToken(
            user_id=user_id,
            token_hash=token_hash,
            device_info=device_info,
            expires_at=expires_at,
        )
        self.db.add(ext_token)
        await self.db.commit()

        return token, expires_at

    async def refresh(self, token: str) -> tuple[str, datetime]:
        ext_token = await self.get_by_token(token)
        if not ext_token or ext_token.revoked_at:
            raise ValueError("无效的扩展 token")

        if ext_token.expires_at < datetime.utcnow():
            raise ValueError("扩展 token 已过期")

        # 生成新 token
        new_token = self._generate_token()
        new_hash = self._hash_token(new_token)
        new_expires = datetime.utcnow() + timedelta(seconds=settings.publish_token_ttl_seconds)

        ext_token.token_hash = new_hash
        ext_token.expires_at = new_expires
        await self.db.commit()

        return new_token, new_expires

    async def get_by_token(self, token: str) -> Optional[ExtensionToken]:
        token_hash = self._hash_token(token)
        result = await self.db.execute(
            select(ExtensionToken).where(ExtensionToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def validate_token(self, token: str) -> Optional[ExtensionToken]:
        ext_token = await self.get_by_token(token)
        if not ext_token:
            return None
        if ext_token.revoked_at:
            return None
        if ext_token.expires_at < datetime.utcnow():
            return None
        return ext_token

    async def revoke_all_by_user(self, user_id: UUID) -> None:
        result = await self.db.execute(
            select(ExtensionToken).where(
                ExtensionToken.user_id == user_id,
                ExtensionToken.revoked_at.is_(None)
            )
        )
        for token in result.scalars().all():
            token.revoked_at = datetime.utcnow()
        await self.db.commit()

    async def revoke(self, token: str) -> None:
        ext_token = await self.get_by_token(token)
        if ext_token and not ext_token.revoked_at:
            ext_token.revoked_at = datetime.utcnow()
            await self.db.commit()
