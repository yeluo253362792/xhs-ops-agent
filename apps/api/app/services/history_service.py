from typing import Optional
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.history import GenerationHistory
from app.schemas.history import HistoryCreate, HistoryUpdate


class HistoryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, user_id: UUID, data: HistoryCreate) -> GenerationHistory:
        history = GenerationHistory(
            user_id=user_id,
            topic=data.topic,
            audience=data.audience,
            content_type=data.content_type,
            tone=data.tone,
            generated_content=data.generated_content,
            compliance_result=data.compliance_result,
        )
        self.db.add(history)
        await self.db.commit()
        await self.db.refresh(history)
        return history

    async def get_list(
        self,
        user_id: UUID,
        keyword: Optional[str] = None,
        favorite_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> list[GenerationHistory]:
        query = select(GenerationHistory).where(
            GenerationHistory.user_id == user_id,
            GenerationHistory.is_deleted == False,
        )

        if favorite_only:
            query = query.where(GenerationHistory.is_favorite == True)

        if keyword:
            query = query.where(
                GenerationHistory.topic.ilike(f"%{keyword}%")
            )

        query = query.order_by(desc(GenerationHistory.created_at)).limit(limit).offset(offset)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_id(self, user_id: UUID, history_id: UUID) -> Optional[GenerationHistory]:
        result = await self.db.execute(
            select(GenerationHistory).where(
                GenerationHistory.id == history_id,
                GenerationHistory.user_id == user_id,
                GenerationHistory.is_deleted == False,
            )
        )
        return result.scalar_one_or_none()

    async def update(self, history: GenerationHistory, data: HistoryUpdate) -> GenerationHistory:
        if data.is_favorite is not None:
            history.is_favorite = data.is_favorite
        await self.db.commit()
        await self.db.refresh(history)
        return history

    async def delete(self, history: GenerationHistory) -> None:
        history.is_deleted = True
        await self.db.commit()
