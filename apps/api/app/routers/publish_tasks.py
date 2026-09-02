import mimetypes
from typing import Optional
from uuid import UUID

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.publish_task import (
    ExtensionLogReport,
    ImageUploadResponse,
    PendingTasksOut,
    PublishTaskCreate,
    PublishTaskListOut,
    PublishTaskOut,
    PublishTaskUpdate,
)
from app.services.extension_token_service import ExtensionTokenService
from app.services.publish_task_service import PublishTaskService
from app.services.temp_image_service import TempImageService
from app.services.extension_selector_service import ExtensionSelectorService

router = APIRouter(prefix="/publish-tasks", tags=["publish-tasks"])


def get_publish_task_service(db: AsyncSession = Depends(get_db)) -> PublishTaskService:
    return PublishTaskService(db)


def get_extension_token_service(db: AsyncSession = Depends(get_db)) -> ExtensionTokenService:
    return ExtensionTokenService(db)


def get_temp_image_service(db: AsyncSession = Depends(get_db)) -> TempImageService:
    return TempImageService(db)


def get_selector_service() -> ExtensionSelectorService:
    return ExtensionSelectorService()


def get_publish_token_from_header(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="缺少认证信息")
    return auth[7:]


@router.post("", response_model=PublishTaskOut, status_code=status.HTTP_201_CREATED)
async def create_publish_task(
    data: PublishTaskCreate,
    current_user: User = Depends(get_current_user),
    service: PublishTaskService = Depends(get_publish_task_service),
):
    """创建发布任务。"""
    task, token = await service.create(current_user.id, data)
    response_data = await service.to_out(task)
    response_data["publish_token"] = token
    response_data["publish_token_expires_at"] = task.publish_token_expires_at
    return response_data


@router.get("", response_model=list[PublishTaskListOut])
async def list_publish_tasks(
    status: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    service: PublishTaskService = Depends(get_publish_task_service),
):
    """获取当前用户的发布任务列表。"""
    tasks = await service.list_by_user(current_user.id, status=status, limit=limit, offset=offset)
    return [service.to_list_out(t) for t in tasks]


@router.get("/pending", response_model=PendingTasksOut)
async def get_pending_tasks(
    request: Request,
    service: PublishTaskService = Depends(get_publish_task_service),
):
    """扩展轮询拉取待处理任务。"""
    token = get_publish_token_from_header(request)
    tasks = await service.get_pending_tasks(token)
    return {"tasks": [await service.to_out(t) for t in tasks]}


@router.get("/{task_id}", response_model=PublishTaskOut)
async def get_publish_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    service: PublishTaskService = Depends(get_publish_task_service),
):
    """获取任务详情。"""
    task = await service.get_by_id(task_id, current_user.id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return await service.to_out(task)


@router.patch("/{task_id}", response_model=PublishTaskOut)
async def update_publish_task(
    task_id: UUID,
    update: PublishTaskUpdate,
    request: Request,
    service: PublishTaskService = Depends(get_publish_task_service),
):
    """扩展上报任务状态。"""
    token = get_publish_token_from_header(request)
    try:
        task = await service.update_status(task_id, token, update)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    return await service.to_out(task)


@router.post("/{task_id}/cancel", response_model=PublishTaskOut)
async def cancel_publish_task(
    task_id: UUID,
    request: Request,
    service: PublishTaskService = Depends(get_publish_task_service),
):
    """取消任务。"""
    token = get_publish_token_from_header(request)
    task = await service.cancel(task_id, token)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return await service.to_out(task)


@router.delete("/{task_id}")
async def delete_publish_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    service: PublishTaskService = Depends(get_publish_task_service),
):
    """软删除任务。"""
    success = await service.delete(task_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"message": "已删除"}


@router.get("/extension/selectors")
async def get_extension_selectors(
    request: Request,
    selector_service: ExtensionSelectorService = Depends(get_selector_service),
    token_service: ExtensionTokenService = Depends(get_extension_token_service),
):
    """扩展拉取小红书 DOM 选择器配置。"""
    token = get_publish_token_from_header(request)
    ext_token = await token_service.validate_token(token)
    if not ext_token:
        raise HTTPException(status_code=401, detail="无效的 token")

    return selector_service.get_selectors()


@router.post("/upload-images", response_model=ImageUploadResponse)
async def upload_images(
    request: Request,
    images: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    image_service: TempImageService = Depends(get_temp_image_service),
):
    """上传临时图片。"""
    if len(images) > settings.temp_image_max_count:
        raise HTTPException(status_code=400, detail=f"最多上传 {settings.temp_image_max_count} 张图片")

    uploaded = []
    for image in images:
        try:
            result = await image_service.save_upload(image)
            uploaded.append(result)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    # 设置 CORS 头
    from datetime import datetime, timedelta
    expires_at = datetime.utcnow() + timedelta(seconds=settings.temp_image_url_ttl_seconds)

    response = JSONResponse(content={
        "uploaded": uploaded,
        "expires_at": expires_at.isoformat()
    })
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


@router.get("/images/{upload_id}/{filename}")
async def download_temp_image(
    upload_id: str,
    filename: str,
    token: str,
    expires_at: int,
    image_service: TempImageService = Depends(get_temp_image_service),
):
    """扩展下载临时图片。"""
    image = await image_service.get_image_for_download(upload_id, filename, token, expires_at)
    if not image:
        raise HTTPException(status_code=404, detail="图片不存在或已过期")

    file_path = image_service.get_file_path(image)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="图片文件不存在")

    media_type = image.mime_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"

    response = FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename
    )
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


@router.post("/extension/logs")
async def report_extension_log(
    report: ExtensionLogReport,
    request: Request,
    token_service: ExtensionTokenService = Depends(get_extension_token_service),
):
    """接收扩展前端日志。"""
    token = get_publish_token_from_header(request)
    ext_token = await token_service.validate_token(token)
    if not ext_token:
        raise HTTPException(status_code=401, detail="无效的 token")

    # 简单记录到后端日志
    import logging
    logger = logging.getLogger("extension.frontend")
    logger.log(
        logging.INFO if report.level != "error" else logging.ERROR,
        f"[Extension] {report.message} | context={report.context}"
    )

    return {"received": True}
