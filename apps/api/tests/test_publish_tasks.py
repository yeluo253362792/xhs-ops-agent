import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db


@pytest.fixture
def client(override_get_db):
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_create_publish_task(client):
    # 登录
    login_res = client.post("/auth/login", data={"username": "test", "password": "test"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post("/publish-tasks", headers=headers, json={
        "content": {
            "titles": ["标题1", "标题2"],
            "selected_title": "标题1",
            "body": "正文内容",
            "tags": ["油皮护肤", "夏季护肤"]
        },
        "images": [],
        "platform": "xiaohongshu",
        "note_type": "图文笔记",
        "is_ai_generated": True
    })
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert data["content"]["selected_title"] == "标题1"
    assert "publish_token" in data
    assert data["progress"]["images"] == "skipped"


def test_list_publish_tasks(client):
    login_res = client.post("/auth/login", data={"username": "test", "password": "test"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 创建任务
    client.post("/publish-tasks", headers=headers, json={
        "content": {
            "titles": ["标题1"],
            "selected_title": "标题1",
            "body": "正文",
            "tags": ["标签"]
        }
    })

    response = client.get("/publish-tasks", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1


def test_extension_token_flow(client):
    # 登录
    login_res = client.post("/auth/login", data={"username": "test", "password": "test"})
    access_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # 创建扩展 token
    ext_res = client.post("/auth/extension-token", headers=headers, json={"device_info": "test"})
    assert ext_res.status_code == 200
    publish_token = ext_res.json()["publish_token"]

    # 用 publish token 拉取 pending 任务（为空）
    pending_headers = {"Authorization": f"Bearer {publish_token}"}
    pending_res = client.get("/publish-tasks/pending", headers=pending_headers)
    assert pending_res.status_code == 200
    assert pending_res.json()["tasks"] == []

    # 刷新 token
    refresh_res = client.post("/auth/extension-token/refresh", headers=pending_headers)
    assert refresh_res.status_code == 200
    assert "publish_token" in refresh_res.json()


def test_publish_task_full_lifecycle(client):
    # 登录
    login_res = client.post("/auth/login", data={"username": "test", "password": "test"})
    access_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # 创建任务
    create_res = client.post("/publish-tasks", headers=headers, json={
        "content": {
            "titles": ["标题1"],
            "selected_title": "标题1",
            "body": "正文",
            "tags": ["标签"]
        }
    })
    task = create_res.json()
    task_id = str(task["id"])
    publish_token = task["publish_token"]

    # 扩展拉取任务，状态变为 fetched
    pending_headers = {"Authorization": f"Bearer {publish_token}"}
    pending_res = client.get("/publish-tasks/pending", headers=pending_headers)
    assert pending_res.status_code == 200
    assert len(pending_res.json()["tasks"]) == 1

    # 更新状态为 prefilling
    patch_res = client.patch(f"/publish-tasks/{task_id}", headers=pending_headers, json={
        "status": "prefilling",
        "progress": {"title": "success", "body": "filling"}
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "prefilling"

    # 更新状态为 waiting_user
    patch_res2 = client.patch(f"/publish-tasks/{task_id}", headers=pending_headers, json={
        "status": "waiting_user",
        "progress": {"title": "success", "body": "success", "tags": "success", "images": "skipped"}
    })
    assert patch_res2.status_code == 200

    # 发布完成
    patch_res3 = client.patch(f"/publish-tasks/{task_id}", headers=pending_headers, json={
        "status": "published"
    })
    assert patch_res3.status_code == 200
    assert patch_res3.json()["status"] == "published"
    assert patch_res3.json()["published_at"] is not None


def test_get_selectors(client):
    # 登录并创建扩展 token
    login_res = client.post("/auth/login", data={"username": "test", "password": "test"})
    access_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    ext_res = client.post("/auth/extension-token", headers=headers, json={})
    publish_token = ext_res.json()["publish_token"]

    selector_headers = {"Authorization": f"Bearer {publish_token}"}
    res = client.get("/publish-tasks/extension/selectors", headers=selector_headers)
    assert res.status_code == 200
    assert "selectors" in res.json()
    assert "titleInput" in res.json()["selectors"]


def test_upload_temp_image(client):
    # 登录
    login_res = client.post("/auth/login", data={"username": "test", "password": "test"})
    access_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    import io
    image_content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 50  # 最小 PNG 占位
    response = client.post(
        "/publish-tasks/upload-images",
        headers=headers,
        files={"images": ("test.png", io.BytesIO(image_content), "image/png")}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["uploaded"]) == 1
    assert data["uploaded"][0]["filename"] == "test.png"
    assert "upload_id" in data["uploaded"][0]
    assert "url" in data["uploaded"][0]
