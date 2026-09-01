from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.history import HistoryCreate, HistoryOut, HistoryUpdate
from app.services.history_service import HistoryService

router = APIRouter(prefix="/history", tags=["history"])


def get_history_service(db: AsyncSession = Depends(get_db)) -> HistoryService:
    return HistoryService(db)


@router.get("", response_model=list[HistoryOut])
async def list_history(
    keyword: Optional[str] = None,
    favorite_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    service: HistoryService = Depends(get_history_service),
):
    """获取当前用户的历史记录。"""
    return await service.get_list(
        user_id=current_user.id,
        keyword=keyword,
        favorite_only=favorite_only,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=HistoryOut)
async def create_history(
    data: HistoryCreate,
    current_user: User = Depends(get_current_user),
    service: HistoryService = Depends(get_history_service),
):
    """保存一条生成记录到历史。"""
    return await service.create(user_id=current_user.id, data=data)


@router.patch("/{history_id}", response_model=HistoryOut)
async def update_history(
    history_id: UUID,
    data: HistoryUpdate,
    current_user: User = Depends(get_current_user),
    service: HistoryService = Depends(get_history_service),
):
    """更新历史记录（如收藏状态）。"""
    history = await service.get_by_id(user_id=current_user.id, history_id=history_id)
    if not history:
        raise HTTPException(status_code=404, detail="历史记录不存在")
    return await service.update(history, data)


@router.delete("/{history_id}")
async def delete_history(
    history_id: UUID,
    current_user: User = Depends(get_current_user),
    service: HistoryService = Depends(get_history_service),
):
    """软删除历史记录。"""
    history = await service.get_by_id(user_id=current_user.id, history_id=history_id)
    if not history:
        raise HTTPException(status_code=404, detail="历史记录不存在")
    await service.delete(history)
    return {"message": "已删除"}
