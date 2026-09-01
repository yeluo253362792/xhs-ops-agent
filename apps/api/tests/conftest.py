import os

# 强制测试环境使用 mock LLM，避免调用真实 API
os.environ["LLM_PROVIDER"] = "mock"
os.environ["LLM_API_KEY"] = ""
os.environ["LLM_BASE_URL"] = ""
os.environ["LLM_MODEL"] = ""
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# 导入并覆盖 settings，确保 .env 文件不会覆盖测试用的 mock 配置
import app.config  # noqa: E402

app.config.settings.llm_provider = "mock"
app.config.settings.llm_api_key = ""
app.config.settings.llm_base_url = ""
app.config.settings.llm_model = ""
app.config.settings.database_url = "sqlite+aiosqlite:///:memory:"

from app.database import Base, get_db  # noqa: E402


@pytest.fixture(scope="function")
async def db_session():
    """创建内存 SQLite 数据库会话，用于测试。"""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with AsyncSessionLocal() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture(scope="function")
def override_get_db(db_session):
    """覆盖 FastAPI 的 get_db 依赖。"""
    async def _get_db():
        yield db_session

    return _get_db
