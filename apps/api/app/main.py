from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.logging_config import setup_logging
from app.routers import health, auth, generate, history, publish_tasks, extension_auth
from app.services.cleanup_service import start_scheduler

setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期事件：启动时创建数据库表（开发环境）并启动定时任务。"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    scheduler = start_scheduler()
    yield
    scheduler.shutdown()


app = FastAPI(title="小红书运营助手 API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(extension_auth.router)
app.include_router(generate.router)
app.include_router(history.router)
app.include_router(publish_tasks.router)


@app.get("/")
async def root():
    return {"message": "小红书运营助手 API", "version": "0.1.0"}
