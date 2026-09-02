from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.publish_task import PublishTask
from app.schemas.publish_task import PublishTaskCreate, PublishTaskUpdate, TaskContent, TaskImage
from app.services.extension_token_service import ExtensionTokenService
from app.services.temp_image_service import TempImageService


VALID_STATUS_TRANSITIONS = {
    "pending": {"fetched", "cancelled", "failed"},
    "fetched": {"prefilling", "cancelled", "failed"},
    "prefilling": {"waiting_user", "failed"},
    "waiting_user": {"published", "cancelled", "failed"},
    "published": set(),
    "cancelled": set(),
    "failed": {"prefilling", "cancelled"},
    "expired": set(),
}

TERMINAL_STATUSES = {"published", "cancelled", "failed", "expired"}


class PublishTaskService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.image_service = TempImageService(db)
        self.token_service = ExtensionTokenService(db)

    async def create(self, user_id: UUID, data: PublishTaskCreate) -> tuple[PublishTask, str]:
        """创建任务，返回 (task, publish_token)。"""
        token, expires_at = await self.token_service.create(user_id)
        token_hash = self.token_service._hash_token(token)

        task = PublishTask(
            user_id=user_id,
            generation_history_id=data.generation_history_id,
            platform=data.platform,
            status="pending",
            content=data.content.model_dump(),
            images=[],
            progress={
                "title": "pending",
                "body": "pending",
                "tags": "pending",
                "images": "pending" if data.images else "skipped",
            },
            logs=[],
            publish_token_hash=token_hash,
            publish_token_expires_at=expires_at,
        )
        self.db.add(task)
        await self.db.flush()  # 获取 task.id

        # 关联图片
        if data.images:
            upload_ids = [img.upload_id for img in data.images]
            attached = await self.image_service.attach_images_to_task(upload_ids, task.id)
            task.images = [{"upload_id": img.upload_id, "filename": img.filename, "is_cover": img.is_cover} for img in attached]

        await self.db.commit()
        await self.db.refresh(task)

        return task, token

    async def get_by_id(self, task_id: UUID, user_id: UUID) -> Optional[PublishTask]:
        result = await self.db.execute(
            select(PublishTask).where(
                PublishTask.id == task_id,
                PublishTask.user_id == user_id,
                PublishTask.is_deleted == False
            )
        )
        return result.scalar_one_or_none()

    async def list_by_user(
        self,
        user_id: UUID,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> list[PublishTask]:
        query = select(PublishTask).where(
            PublishTask.user_id == user_id,
            PublishTask.is_deleted == False
        )

        if status:
            statuses = [s.strip() for s in status.split(",")]
            query = query.where(PublishTask.status.in_(statuses))

        query = query.order_by(desc(PublishTask.created_at)).limit(limit).offset(offset)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_pending_tasks(self, token: str) -> list[PublishTask]:
        ext_token = await self.token_service.validate_token(token)
        if not ext_token:
            return []

        # 将拉取到的 pending 任务标记为 fetched
        result = await self.db.execute(
            select(PublishTask).where(
                PublishTask.user_id == ext_token.user_id,
                PublishTask.status == "pending",
                PublishTask.is_deleted == False
            ).order_by(desc(PublishTask.created_at))
        )
        tasks = result.scalars().all()

        for task in tasks:
            task.status = "fetched"
            task.logs.append({
                "time": datetime.utcnow().isoformat(),
                "level": "info",
                "message": "扩展已拉取任务"
            })

        await self.db.commit()
        return list(tasks)

    async def update_status(
        self,
        task_id: UUID,
        token: str,
        update: PublishTaskUpdate
    ) -> Optional[PublishTask]:
        ext_token = await self.token_service.validate_token(token)
        if not ext_token:
            return None

        result = await self.db.execute(
            select(PublishTask).where(
                PublishTask.id == task_id,
                PublishTask.user_id == ext_token.user_id,
                PublishTask.is_deleted == False
            )
        )
        task = result.scalar_one_or_none()
        if not task:
            return None

        if update.status:
            if not self._is_valid_transition(task.status, update.status):
                raise ValueError(f"非法的状态流转：{task.status} -> {update.status}")

            task.status = update.status
            now = datetime.utcnow()
            if update.status == "published":
                task.published_at = now
            elif update.status == "cancelled":
                task.cancelled_at = now
            elif update.status == "failed":
                task.failed_at = now

        if update.progress:
            task.progress.update(update.progress)

        if update.logs:
            task.logs.extend(update.logs)

        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def cancel(self, task_id: UUID, token: str) -> Optional[PublishTask]:
        return await self.update_status(
            task_id,
            token,
            PublishTaskUpdate(status="cancelled", logs=[{
                "time": datetime.utcnow().isoformat(),
                "level": "info",
                "message": "用户取消任务"
            }])
        )

    async def delete(self, task_id: UUID, user_id: UUID) -> bool:
        task = await self.get_by_id(task_id, user_id)
        if not task:
            return False

        task.is_deleted = True
        await self.db.commit()
        return True

    async def cleanup_expired(self) -> int:
        """将过期任务标记为 expired，返回处理数量。"""
        expired_time = datetime.utcnow() - timedelta(seconds=settings.publish_task_ttl_seconds)
        result = await self.db.execute(
            select(PublishTask).where(
                PublishTask.status.notin_(list(TERMINAL_STATUSES)),
                PublishTask.created_at < expired_time,
                PublishTask.is_deleted == False
            )
        )
        tasks = result.scalars().all()

        count = 0
        for task in tasks:
            task.status = "expired"
            task.logs.append({
                "time": datetime.utcnow().isoformat(),
                "level": "warning",
                "message": "任务超过 24 小时未处理，已过期"
            })
            count += 1

        await self.db.commit()
        return count

    def _is_valid_transition(self, current: str, next_status: str) -> bool:
        return next_status in VALID_STATUS_TRANSITIONS.get(current, set())

    async def to_out(self, task: PublishTask) -> dict:
        """将 ORM 对象转换为可序列化的 dict，包含图片 URL。"""
        content = TaskContent(**task.content)

        # 获取关联图片并生成 URL
        images = []
        image_records = await self.image_service.get_task_images(task.id)
        for img in image_records:
            token = self.image_service._generate_token(img.upload_id, img.filename, img.expires_at)
            images.append(TaskImage(
                url=self.image_service._get_public_url(img.upload_id, img.filename, token, img.expires_at),
                filename=img.filename,
                mime_type=img.mime_type,
                is_cover=img.is_cover
            ))

        return {
            "id": task.id,
            "status": task.status,
            "platform": task.platform,
            "content": content.model_dump(),
            "images": [img.model_dump() for img in images],
            "is_ai_generated": True,
            "progress": task.progress,
            "logs": task.logs,
            "published_at": task.published_at,
            "cancelled_at": task.cancelled_at,
            "failed_at": task.failed_at,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
        }

    def to_list_out(self, task: PublishTask) -> dict:
        content = TaskContent(**task.content)
        return {
            "id": task.id,
            "status": task.status,
            "platform": task.platform,
            "note_type": "图文笔记",
            "content": content.model_dump(),
            "images_count": len(task.images) if task.images else 0,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
            "published_at": task.published_at,
        }
