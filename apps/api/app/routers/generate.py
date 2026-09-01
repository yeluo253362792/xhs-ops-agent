from fastapi import APIRouter, Depends, HTTPException

from app.schemas.generation import GenerateRequest, GenerateResponse
from app.services.generation_service import GenerationService
from app.routers.auth import get_current_user, User

router = APIRouter(prefix="/generate", tags=["generate"])


def get_generation_service() -> GenerationService:
    return GenerationService()


@router.post("", response_model=GenerateResponse)
async def generate_note(
    request: GenerateRequest,
    current_user: User = Depends(get_current_user),
    service: GenerationService = Depends(get_generation_service),
):
    """生成小红书笔记（需登录）。"""
    result = await service.generate(request)
    if not result.success and result.error:
        raise HTTPException(status_code=400, detail=result.error)
    return result


@router.post("/anonymous", response_model=GenerateResponse)
async def generate_note_anonymous(
    request: GenerateRequest,
    service: GenerationService = Depends(get_generation_service),
):
    """匿名生成（用于演示和未登录场景）。"""
    result = await service.generate(request)
    if not result.success and result.error:
        raise HTTPException(status_code=400, detail=result.error)
    return result
