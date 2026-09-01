from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.generation import GenerateRequest, GenerateResponse
from app.schemas.history import HistoryCreate
from app.services.generation_service import GenerationService
from app.services.history_service import HistoryService

router = APIRouter(prefix="/generate", tags=["generate"])


def get_generation_service() -> GenerationService:
    return GenerationService()


def get_history_service(db: AsyncSession = Depends(get_db)) -> HistoryService:
    return HistoryService(db)


@router.post("", response_model=GenerateResponse)
async def generate_note(
    request: GenerateRequest,
    current_user: User = Depends(get_current_user),
    service: GenerationService = Depends(get_generation_service),
    history_service: HistoryService = Depends(get_history_service),
):
    """生成小红书笔记（需登录），并保存到历史记录。"""
    result = await service.generate(request)
    if not result.success and result.error:
        raise HTTPException(status_code=400, detail=result.error)

    # 保存到历史记录
    if result.success and result.data:
        await history_service.create(
            user_id=current_user.id,
            data=HistoryCreate(
                topic=request.topic,
                audience=request.audience,
                content_type=request.content_type,
                tone=request.tone,
                generated_content=result.data.model_dump(),
                compliance_result=result.compliance.model_dump() if result.compliance else None,
            ),
        )

    return result


@router.post("/anonymous", response_model=GenerateResponse)
async def generate_note_anonymous(
    request: GenerateRequest,
    service: GenerationService = Depends(get_generation_service),
):
    """匿名生成（用于演示和未登录场景），不保存历史记录。"""
    result = await service.generate(request)
    if not result.success and result.error:
        raise HTTPException(status_code=400, detail=result.error)
    return result
