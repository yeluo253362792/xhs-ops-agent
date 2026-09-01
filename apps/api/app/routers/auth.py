from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# MVP 固定测试用户 UUID（后续替换为真实用户系统）
TEST_USER_ID = UUID("550e8400-e29b-41d4-a716-446655440000")
TEST_USER_EMAIL = "user@example.com"
TEST_USER_PASSWORD_HASH = "mock-hash-not-used-for-verification"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password[:72])


async def ensure_test_user(db: AsyncSession) -> User:
    """确保 MVP 测试用户已写入数据库，避免历史记录外键约束失败。"""
    result = await db.execute(select(User).where(User.id == TEST_USER_ID))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            id=TEST_USER_ID,
            email=TEST_USER_EMAIL,
            password_hash=TEST_USER_PASSWORD_HASH,
            nickname="测试用户",
            subscription_tier="free",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # 优先从数据库查询；若不存在则自动创建（MVP 阶段兼容 mock 用户）
    parsed_id = UUID(user_id)
    result = await db.execute(select(User).where(User.id == parsed_id))
    user = result.scalar_one_or_none()
    if user is None:
        if parsed_id == TEST_USER_ID:
            user = await ensure_test_user(db)
        else:
            raise credentials_exception
    return user


@router.post("/register", response_model=UserOut)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    await ensure_test_user(db)
    return UserOut(
        id=str(TEST_USER_ID),
        email=user_in.email,
        nickname=None,
        subscription_tier="free",
    )


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    await ensure_test_user(db)
    access_token = create_access_token(data={"sub": str(TEST_USER_ID)})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
async def read_me(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=str(current_user.id),
        email=current_user.email,
        nickname=current_user.nickname,
        subscription_tier=current_user.subscription_tier,
    )
