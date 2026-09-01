import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db


@pytest.fixture
def client(override_get_db):
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_generate_anonymous(client):
    response = client.post("/generate/anonymous", json={
        "topic": "油皮夏季护肤",
        "audience": "20-30岁油皮女生",
        "content_type": "干货收藏型",
        "tone": "亲切自然",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "data" in data
    assert "compliance" in data
    assert len(data["data"]["titles"]) == 3
    assert len(data["data"]["tags"]) >= 5


def test_generate_missing_topic(client):
    response = client.post("/generate/anonymous", json={
        "topic": "",
        "audience": "20-30岁油皮女生",
        "content_type": "干货收藏型",
    })
    assert response.status_code == 422


def test_generate_invalid_content_type(client):
    response = client.post("/generate/anonymous", json={
        "topic": "测试",
        "audience": "测试用户",
        "content_type": "不存在的类型",
    })
    assert response.status_code == 422


def test_generate_and_save_history(client):
    # 登录
    login_res = client.post("/auth/login", data={"username": "test", "password": "test"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 生成并保存历史
    response = client.post("/generate", headers=headers, json={
        "topic": "油皮夏季护肤",
        "audience": "20-30岁油皮女生",
        "content_type": "干货收藏型",
    })
    assert response.status_code == 200
    assert response.json()["success"] is True

    # 验证历史记录已保存
    history_res = client.get("/history", headers=headers)
    assert history_res.status_code == 200
    assert len(history_res.json()) == 1
