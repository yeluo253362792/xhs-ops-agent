from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user
from app.services.extension_token_service import ExtensionTokenService

router = APIRouter(prefix="/auth", tags=["extension-auth"])


class ExtensionTokenCreate(BaseModel):
    device_info: Optional[str] = None


class ExtensionTokenOut(BaseModel):
    publish_token: str
    token_type: str = "bearer"
    expires_in: int
    expires_at: datetime


def get_extension_token_service(db: AsyncSession = Depends(get_db)) -> ExtensionTokenService:
    return ExtensionTokenService(db)


def get_publish_token_from_header(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="缺少认证信息")
    return auth[7:]


@router.post("/extension-token", response_model=ExtensionTokenOut)
async def create_extension_token(
    data: ExtensionTokenCreate,
    current_user = Depends(get_current_user),
    service: ExtensionTokenService = Depends(get_extension_token_service),
):
    """为浏览器扩展创建 publish token。"""
    from app.config import settings
    token, expires_at = await service.create(current_user.id, data.device_info)
    return ExtensionTokenOut(
        publish_token=token,
        expires_in=settings.publish_token_ttl_seconds,
        expires_at=expires_at
    )


@router.post("/extension-token/refresh", response_model=ExtensionTokenOut)
async def refresh_extension_token(
    request: Request,
    service: ExtensionTokenService = Depends(get_extension_token_service),
):
    """刷新 publish token。"""
    from app.config import settings
    token = get_publish_token_from_header(request)
    try:
        new_token, expires_at = await service.refresh(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    return ExtensionTokenOut(
        publish_token=new_token,
        expires_in=settings.publish_token_ttl_seconds,
        expires_at=expires_at
    )
