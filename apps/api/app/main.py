from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, auth, generate

app = FastAPI(title="小红书运营助手 API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(generate.router)


@app.get("/")
async def root():
    return {"message": "小红书运营助手 API", "version": "0.1.0"}
