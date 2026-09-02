import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base
from app.services.publish_task_service import PublishTaskService
from app.services.temp_image_service import TempImageService

logger = logging.getLogger(__name__)


async def cleanup_expired_tasks_and_images():
    """清理过期任务和临时图片。"""
    engine = create_async_engine(settings.database_url)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as db:
        try:
            task_service = PublishTaskService(db)
            image_service = TempImageService(db)

            expired_tasks = await task_service.cleanup_expired()
            expired_images = await image_service.cleanup_expired()

            logger.info(f"清理完成：{expired_tasks} 个过期任务，{expired_images} 张过期图片")
        except Exception as e:
            logger.error(f"清理失败：{e}")
        finally:
            await db.close()

    await engine.dispose()


def start_scheduler() -> AsyncIOScheduler:
    """启动定时任务调度器。"""
    scheduler = AsyncIOScheduler()
    # 每天凌晨 3 点执行清理
    scheduler.add_job(
        cleanup_expired_tasks_and_images,
        "cron",
        hour=3,
        minute=0,
        id="cleanup_expired_tasks_and_images",
        replace_existing=True
    )
    scheduler.start()
    logger.info("定时清理任务已启动")
    return scheduler
