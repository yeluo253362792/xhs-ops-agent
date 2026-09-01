import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db


@pytest.fixture
def client(override_get_db):
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_history_crud(client):
    # 1. 登录获取 token
    login_res = client.post("/auth/login", data={"username": "test", "password": "test"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. 创建历史记录
    create_res = client.post("/history", headers=headers, json={
        "topic": "油皮夏季护肤",
        "audience": "20-30岁女生",
        "content_type": "干货收藏型",
        "generated_content": {"titles": ["标题1"], "body": "正文"},
        "compliance_result": {"level": "low", "issues": [], "suggestions": []},
    })
    assert create_res.status_code == 200
    history_id = str(create_res.json()["id"])

    # 3. 列表查询
    list_res = client.get("/history", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # 4. 更新收藏状态
    update_res = client.patch(f"/history/{history_id}", headers=headers, json={"is_favorite": True})
    assert update_res.status_code == 200
    assert update_res.json()["is_favorite"] is True

    # 5. 删除
    delete_res = client.delete(f"/history/{history_id}", headers=headers)
    assert delete_res.status_code == 200

    # 6. 删除后列表为空
    list_res2 = client.get("/history", headers=headers)
    assert len(list_res2.json()) == 0
