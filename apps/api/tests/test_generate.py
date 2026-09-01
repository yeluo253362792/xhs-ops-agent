from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_generate_anonymous():
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


def test_generate_missing_topic():
    response = client.post("/generate/anonymous", json={
        "topic": "",
        "audience": "20-30岁油皮女生",
        "content_type": "干货收藏型",
    })
    assert response.status_code == 422


def test_generate_invalid_content_type():
    response = client.post("/generate/anonymous", json={
        "topic": "测试",
        "audience": "测试用户",
        "content_type": "不存在的类型",
    })
    assert response.status_code == 422
