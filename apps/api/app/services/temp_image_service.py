from typing import Optional
import hashlib
import hmac
import mimetypes
import os
import shutil
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from uuid import UUID

import aiofiles
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.publish_task_image import PublishTaskImage


class TempImageService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.base_path = Path(settings.temp_image_storage_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _generate_upload_id(self) -> str:
        return str(uuid.uuid4())

    def _generate_token(self, upload_id: str, filename: str, expires_at: datetime) -> str:
        """生成短期访问 token：HMAC(secret, upload_id + filename + expires_at)"""
        message = f"{upload_id}:{filename}:{int(expires_at.timestamp())}"
        return hmac.new(
            settings.secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()[:32]

    def _hash_token(self, token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    def _validate_token(self, upload_id: str, filename: str, expires_at: int, token: str) -> bool:
        expected = self._generate_token(upload_id, filename, datetime.utcfromtimestamp(expires_at))
        return hmac.compare_digest(expected, token)

    def _get_storage_dir(self, upload_id: str) -> Path:
        return self.base_path / upload_id

    def _get_file_path(self, upload_id: str, filename: str) -> Path:
        return self._get_storage_dir(upload_id) / filename

    def _get_public_url(self, upload_id: str, filename: str, token: str, expires_at: datetime) -> str:
        return (
            f"/api/v1/publish-tasks/images/{upload_id}/{filename}"
            f"?token={token}&expires_at={int(expires_at.timestamp())}"
        )

    async def save_upload(
        self,
        file: UploadFile,
        task_id: Optional[UUID] = None,
        is_cover: bool = False
    ) -> dict:
        upload_id = self._generate_upload_id()
        filename = file.filename or "image.jpg"
        mime_type = file.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"

        # 读取文件内容
        content = await file.read()
        size = len(content)

        max_size = settings.temp_image_max_size_mb * 1024 * 1024
        if size > max_size:
            raise ValueError(f"图片大小超过限制：{settings.temp_image_max_size_mb}MB")

        # 保存到本地
        storage_dir = self._get_storage_dir(upload_id)
        storage_dir.mkdir(parents=True, exist_ok=True)
        file_path = storage_dir / filename

        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)

        # 生成访问 token
        expires_at = datetime.utcnow() + timedelta(seconds=settings.temp_image_url_ttl_seconds)
        token = self._generate_token(upload_id, filename, expires_at)
        token_hash = self._hash_token(token)

        # 保存记录
        image_record = PublishTaskImage(
            task_id=task_id,
            upload_id=upload_id,
            storage_key=str(file_path.relative_to(self.base_path)),
            filename=filename,
            mime_type=mime_type,
            size=size,
            is_cover=is_cover,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(image_record)
        await self.db.commit()

        return {
            "upload_id": upload_id,
            "filename": filename,
            "mime_type": mime_type,
            "size": size,
            "url": self._get_public_url(upload_id, filename, token, expires_at),
            "is_cover": is_cover,
        }

    async def get_image_for_download(self, upload_id: str, filename: str, token: str, expires_at: int) -> Optional[PublishTaskImage]:
        # 验证 token 和有效期
        if not self._validate_token(upload_id, filename, expires_at, token):
            return None

        if datetime.utcnow().timestamp() > expires_at:
            return None

        result = await self.db.execute(
            select(PublishTaskImage).where(
                PublishTaskImage.upload_id == upload_id,
                PublishTaskImage.filename == filename
            )
        )
        image = result.scalar_one_or_none()
        if not image:
            return None

        # 更新下载时间
        image.downloaded_at = datetime.utcnow()
        await self.db.commit()

        return image

    def get_file_path(self, image: PublishTaskImage) -> Path:
        return self.base_path / image.storage_key

    async def delete_image(self, image: PublishTaskImage) -> None:
        file_path = self.get_file_path(image)
        try:
            if file_path.exists():
                os.remove(file_path)
            # 如果目录为空，删除目录
            dir_path = file_path.parent
            if dir_path.exists() and not any(dir_path.iterdir()):
                shutil.rmtree(dir_path)
        except OSError:
            pass

        await self.db.delete(image)
        await self.db.commit()

    async def attach_images_to_task(self, upload_ids: list[str], task_id: UUID) -> list[PublishTaskImage]:
        result = await self.db.execute(
            select(PublishTaskImage).where(PublishTaskImage.upload_id.in_(upload_ids))
        )
        images = result.scalars().all()

        for image in images:
            image.task_id = task_id

        await self.db.commit()
        return list(images)

    async def get_task_images(self, task_id: UUID) -> list[PublishTaskImage]:
        result = await self.db.execute(
            select(PublishTaskImage).where(PublishTaskImage.task_id == task_id)
        )
        return list(result.scalars().all())

    async def cleanup_expired(self) -> int:
        """清理已过期的临时图片，返回删除数量。"""
        result = await self.db.execute(
            select(PublishTaskImage).where(PublishTaskImage.expires_at < datetime.utcnow())
        )
        images = result.scalars().all()

        count = 0
        for image in images:
            await self.delete_image(image)
            count += 1

        return count
