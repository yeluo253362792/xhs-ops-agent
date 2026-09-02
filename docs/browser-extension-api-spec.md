# 浏览器扩展后端 API 详细接口文档

> 适用项目：小红书运营助手（xhs-ops-agent）  
> 版本：v1.0  
> 日期：2026-09-02

---

## 1. 接口概览

| 接口 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| 创建发布任务 | POST | `/api/v1/publish-tasks` | JWT | Web App 创建任务 |
| 获取任务列表 | GET | `/api/v1/publish-tasks` | JWT | Web App 查看任务 |
| 获取待处理任务 | GET | `/api/v1/publish-tasks/pending` | Publish Token | 扩展轮询拉取 |
| 获取任务详情 | GET | `/api/v1/publish-tasks/{id}` | JWT / Publish Token | 查询单条任务 |
| 更新任务状态 | PATCH | `/api/v1/publish-tasks/{id}` | Publish Token | 扩展上报进度 |
| 取消任务 | POST | `/api/v1/publish-tasks/{id}/cancel` | JWT / Publish Token | 取消任务 |
| 删除任务 | DELETE | `/api/v1/publish-tasks/{id}` | JWT | 软删除任务 |
| 获取扩展 Token | POST | `/api/v1/auth/extension-token` | JWT | 扩展获取轮询 token |
| 刷新扩展 Token | POST | `/api/v1/auth/extension-token/refresh` | Publish Token | 刷新轮询 token |
| 上传临时图片 | POST | `/api/v1/publish-tasks/upload-images` | JWT | 上传发布配图 |
| 获取扩展选择器 | GET | `/api/v1/extension/selectors` | Publish Token | 扩展拉取 DOM 选择器 |
| 上报扩展日志 | POST | `/api/v1/extension/logs` | Publish Token | 扩展上报前端日志 |

---

## 2. 认证说明

### 2.1 JWT 认证（Web App）
```http
Authorization: Bearer <access_token>
```

### 2.2 Publish Token 认证（扩展）
```http
Authorization: Bearer <publish_token>
```

- `publish_token` 仅用于扩展轮询任务和上报状态
- 有效期 10 分钟
- 不可用于访问用户敏感信息或其他业务接口

---

## 3. 接口详情

### 3.1 创建发布任务

```http
POST /api/v1/publish-tasks
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求体：**
```json
{
  "content": {
    "titles": ["标题1", "标题2", "标题3"],
    "selected_title": "标题1",
    "body": "正文内容，支持换行和表情 🌟",
    "tags": ["油皮护肤", "夏季护肤", "急救技巧"],
    "cover_text": "油皮夏季护肤"
  },
  "images": [
    {
      "upload_id": "uuid-of-uploaded-image-1",
      "filename": "cover.jpg",
      "is_cover": true
    },
    {
      "upload_id": "uuid-of-uploaded-image-2",
      "filename": "detail1.jpg",
      "is_cover": false
    }
  ],
  "platform": "xiaohongshu",
  "note_type": "图文笔记",
  "is_ai_generated": true,
  "generation_history_id": "uuid-of-history-record"
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | object | 是 | 发布内容 |
| content.titles | array<string> | 是 | 候选标题列表 |
| content.selected_title | string | 是 | 选中的标题 |
| content.body | string | 是 | 正文 |
| content.tags | array<string> | 是 | 标签，不带 # |
| content.cover_text | string | 否 | 封面文案 |
| images | array<object> | 否 | 配图列表 |
| images[].upload_id | string | 是 | 临时图片上传后的 ID |
| images[].filename | string | 是 | 文件名 |
| images[].is_cover | boolean | 否 | 是否为封面，默认 false |
| platform | string | 是 | 目标平台，默认 xiaohongshu |
| note_type | string | 是 | 笔记类型 |
| is_ai_generated | boolean | 是 | 是否 AI 生成 |
| generation_history_id | string | 否 | 关联的历史记录 ID |

**响应：**
```json
{
  "id": "task-uuid",
  "status": "pending",
  "publish_token": "ext_abc123",
  "publish_token_expires_at": "2026-09-02T10:10:00Z",
  "created_at": "2026-09-02T10:00:00Z"
}
```

---

### 3.2 获取任务列表（Web App）

```http
GET /api/v1/publish-tasks?status=&limit=20&offset=0
Authorization: Bearer <access_token>
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 按状态筛选，多个用逗号分隔 |
| limit | integer | 否 | 默认 20，最大 100 |
| offset | integer | 否 | 默认 0 |

**响应：**
```json
{
  "total": 42,
  "items": [
    {
      "id": "task-uuid",
      "status": "published",
      "platform": "xiaohongshu",
      "note_type": "图文笔记",
      "content": {
        "selected_title": "油皮夏季护肤 5 个急救技巧",
        "body": "正文...",
        "tags": ["油皮护肤", "夏季护肤"]
      },
      "images_count": 3,
      "created_at": "2026-09-02T10:00:00Z",
      "updated_at": "2026-09-02T10:05:00Z",
      "published_at": "2026-09-02T10:05:00Z"
    }
  ]
}
```

---

### 3.3 获取待处理任务（扩展轮询）

```http
GET /api/v1/publish-tasks/pending
Authorization: Bearer <publish_token>
```

**响应：**
```json
{
  "tasks": [
    {
      "id": "task-uuid",
      "status": "pending",
      "platform": "xiaohongshu",
      "content": {
        "titles": ["标题1", "标题2", "标题3"],
        "selected_title": "标题1",
        "body": "正文...",
        "tags": ["油皮护肤", "夏季护肤"],
        "cover_text": "封面文案"
      },
      "images": [
        {
          "url": "https://cdn.example.com/temp/1.jpg?sign=xxx",
          "filename": "cover.jpg",
          "mime_type": "image/jpeg",
          "is_cover": true
        }
      ],
      "is_ai_generated": true,
      "created_at": "2026-09-02T10:00:00Z"
    }
  ]
}
```

**特殊说明：**
- 调用后，返回的 pending 任务状态自动变更为 `fetched`
- 图片 URL 为 15 分钟有效期的预签名 URL

---

### 3.4 获取任务详情

```http
GET /api/v1/publish-tasks/{id}
Authorization: Bearer <access_token> 或 Bearer <publish_token>
```

**响应：**
```json
{
  "id": "task-uuid",
  "status": "waiting_user",
  "platform": "xiaohongshu",
  "content": { ... },
  "images": [ ... ],
  "progress": {
    "title": "success",
    "body": "success",
    "tags": "failed",
    "images": "success"
  },
  "logs": [
    {
      "time": "2026-09-02T10:05:23Z",
      "level": "info",
      "message": "标题填充成功"
    },
    {
      "time": "2026-09-02T10:05:25Z",
      "level": "error",
      "message": "标签输入框未找到"
    }
  ],
  "created_at": "2026-09-02T10:00:00Z",
  "updated_at": "2026-09-02T10:05:30Z"
}
```

---

### 3.5 更新任务状态（扩展上报）

```http
PATCH /api/v1/publish-tasks/{id}
Authorization: Bearer <publish_token>
Content-Type: application/json
```

**请求体：**
```json
{
  "status": "prefilling",
  "progress": {
    "title": "success",
    "body": "success",
    "tags": "failed",
    "images": "pending"
  },
  "logs": [
    {
      "time": "2026-09-02T10:05:25Z",
      "level": "error",
      "message": "标签输入框未找到"
    }
  ]
}
```

**状态流转规则：**

| 当前状态 | 允许变更到 |
|----------|-----------|
| pending | fetched（系统自动） |
| fetched | prefilling, cancelled, failed |
| prefilling | waiting_user, failed |
| waiting_user | published, cancelled, failed |
| published | -（终态） |
| cancelled | -（终态） |
| failed | prefilling, cancelled |
| expired | -（终态） |

**响应：**
```json
{
  "id": "task-uuid",
  "status": "prefilling",
  "updated_at": "2026-09-02T10:05:30Z"
}
```

---

### 3.6 取消任务

```http
POST /api/v1/publish-tasks/{id}/cancel
Authorization: Bearer <access_token> 或 Bearer <publish_token>
```

**响应：**
```json
{
  "id": "task-uuid",
  "status": "cancelled",
  "cancelled_at": "2026-09-02T10:06:00Z"
}
```

---

### 3.7 删除任务

```http
DELETE /api/v1/publish-tasks/{id}
Authorization: Bearer <access_token>
```

**响应：**
```json
{
  "id": "task-uuid",
  "deleted": true
}
```

**说明：** 软删除，数据库中保留记录但标记 `is_deleted=true`。

---

### 3.8 获取扩展 Token

```http
POST /api/v1/auth/extension-token
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "device_info": "Chrome Extension 1.0.0"
}
```

**响应：**
```json
{
  "publish_token": "ext_abc123",
  "token_type": "bearer",
  "expires_in": 600,
  "expires_at": "2026-09-02T10:10:00Z"
}
```

---

### 3.9 刷新扩展 Token

```http
POST /api/v1/auth/extension-token/refresh
Authorization: Bearer <publish_token>
```

**响应：**
```json
{
  "publish_token": "ext_def456",
  "token_type": "bearer",
  "expires_in": 600,
  "expires_at": "2026-09-02T10:20:00Z"
}
```

---

### 3.10 上传临时图片

```http
POST /api/v1/publish-tasks/upload-images
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| images | file[] | 是 | 图片文件，最多 9 张 |
| task_id | string | 否 | 关联的任务 ID，可选 |

**限制：**
- 单张最大 10MB
- 支持格式：jpg, jpeg, png, webp
- 最多 9 张

**响应：**
```json
{
  "uploaded": [
    {
      "id": "upload-uuid-1",
      "filename": "cover.jpg",
      "mime_type": "image/jpeg",
      "size": 123456,
      "url": "https://cdn.example.com/temp/uuid-1.jpg?sign=xxx",
      "is_cover": false
    }
  ],
  "expires_at": "2026-09-02T10:15:00Z"
}
```

---

### 3.11 获取扩展选择器配置

```http
GET /api/v1/extension/selectors
Authorization: Bearer <publish_token>
```

**响应：**
```json
{
  "version": "2026-09-02-01",
  "updated_at": "2026-09-02T08:00:00Z",
  "selectors": {
    "titleInput": [
      "input[placeholder*=\"标题\"]",
      "textarea[placeholder*=\"标题\"]",
      "[data-testid=\"note-title-input\"]"
    ],
    "bodyTextarea": [
      "textarea[placeholder*=\"正文\"]",
      "div[contenteditable=\"true\"][placeholder*=\"正文\"]",
      "[data-testid=\"note-content-input\"]"
    ],
    "tagInput": [
      "input[placeholder*=\"标签\"]",
      "input[placeholder*=\"话题\"]",
      "[data-testid=\"note-tag-input\"]"
    ],
    "imageUpload": [
      "input[type=\"file\"][accept*=\"image\"]",
      "[data-testid=\"image-upload\"] input[type=\"file\"]"
    ],
    "publishButton": [
      "button:contains(\"发布\")",
      "[data-testid=\"publish-button\"]"
    ],
    "loginIndicator": [
      ".creator-home",
      ".publish-entry",
      "[data-testid=\"user-avatar\"]"
    ],
    "loginQrCode": [
      ".login-qrcode",
      ".login-form"
    ]
  }
}
```

---

### 3.12 上报扩展日志

```http
POST /api/v1/extension/logs
Authorization: Bearer <publish_token>
Content-Type: application/json
```

**请求体：**
```json
{
  "level": "error",
  "message": "标签输入框未找到",
  "context": {
    "task_id": "task-uuid",
    "page_url": "https://creator.xiaohongshu.com/publish",
    "selector_version": "2026-09-02-01",
    "browser": "Chrome 128.0"
  },
  "timestamp": "2026-09-02T10:05:25Z"
}
```

**响应：**
```json
{
  "received": true
}
```

---

## 4. 错误码

### 4.1 HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 认证失败或 token 过期 |
| 403 | 无权访问该任务 |
| 404 | 任务不存在 |
| 409 | 状态冲突（如任务已过期） |
| 422 | 业务校验失败 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

### 4.2 业务错误码

| 错误码 | 说明 | 场景 |
|--------|------|------|
| PUBLISH_TASK_NOT_FOUND | 任务不存在 | 查询/更新不存在任务 |
| PUBLISH_TASK_EXPIRED | 任务已过期 | 扩展拉取 24h 前任务 |
| PUBLISH_TASK_INVALID_STATUS | 状态非法 | 状态机流转不允许 |
| PUBLISH_TOKEN_EXPIRED | 扩展 token 过期 | 轮询 token 失效 |
| PUBLISH_TOKEN_INVALID | 扩展 token 无效 | token 格式错误或已吊销 |
| IMAGE_UPLOAD_TOO_LARGE | 图片过大 | 单张超过 10MB |
| IMAGE_UPLOAD_INVALID_TYPE | 图片格式不支持 | 非 jpg/png/webp |
| IMAGE_UPLOAD_LIMIT_EXCEEDED | 图片数量超限 | 超过 9 张 |
| QUOTA_EXCEEDED | 当日发布任务配额超限 | 免费用户超限 |

### 4.3 错误响应格式

```json
{
  "error": {
    "code": "PUBLISH_TASK_EXPIRED",
    "message": "发布任务已过期",
    "details": {
      "task_id": "task-uuid",
      "expired_at": "2026-09-03T10:00:00Z"
    }
  }
}
```

---

## 5. 数据模型

### 5.1 PublishTask 模型

```python
class PublishTask(Base):
    __tablename__ = "publish_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    generation_history_id = Column(UUID(as_uuid=True), ForeignKey("generation_history.id"), nullable=True)

    platform = Column(String(50), default="xiaohongshu")
    status = Column(String(50), default="pending")

    content = Column(JSONB, nullable=False)
    images = Column(JSONB, default=list)
    progress = Column(JSONB, default=dict)
    logs = Column(JSONB, default=list)

    publish_token_hash = Column(String(255))
    publish_token_expires_at = Column(DateTime)

    published_at = Column(DateTime)
    cancelled_at = Column(DateTime)
    failed_at = Column(DateTime)
    is_deleted = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### 5.2 PublishTaskImage 模型

```python
class PublishTaskImage(Base):
    __tablename__ = "publish_task_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("publish_tasks.id"), nullable=False)

    storage_key = Column(String(500), nullable=False)
    filename = Column(String(255))
    mime_type = Column(String(100))
    size = Column(Integer)
    is_cover = Column(Boolean, default=False)

    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### 5.3 ExtensionToken 模型

```python
class ExtensionToken(Base):
    __tablename__ = "extension_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    token_hash = Column(String(255), nullable=False, unique=True)
    device_info = Column(String(255))
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime)

    created_at = Column(DateTime, default=datetime.utcnow)
```

---

## 6. 限流策略

| 接口 | 限流策略 |
|------|---------|
| POST /api/v1/publish-tasks | 10/小时 per user |
| GET /api/v1/publish-tasks/pending | 60/分钟 per publish_token |
| PATCH /api/v1/publish-tasks/{id} | 30/分钟 per publish_token |
| POST /api/v1/auth/extension-token | 5/分钟 per user |
| POST /api/v1/publish-tasks/upload-images | 20/小时 per user |
| POST /api/v1/extension/logs | 120/分钟 per publish_token |

---

## 7. 安全设计

### 7.1 Publish Token
- 使用加密安全的随机字符串，长度 64 字节
- 数据库存储 SHA-256 哈希，不存明文
- 有效期 10 分钟，支持刷新
- 登出时吊销所有该用户的 extension tokens

### 7.2 图片 URL
- 使用预签名 URL，有效期 15 分钟
- bucket 私有，禁止匿名访问
- URL 中包含随机签名参数，不可猜测

### 7.3 输入校验
- 标题长度 ≤ 50 字
- 正文长度 ≤ 2000 字
- 标签数量 ≤ 10 个，每个 ≤ 20 字
- 图片数量 ≤ 9 张

---

## 8. 定时任务

### 8.1 清理过期任务
```python
# 每天凌晨 3 点执行
async def cleanup_expired_tasks():
    # 1. 标记超过 24h 的 pending/fetched 任务为 expired
    # 2. 删除对应的临时图片
    # 3. 吊销过期的 extension tokens
```

### 8.2 删除已完成任务的临时图片
```python
async def cleanup_completed_task_images():
    # 任务状态为 published/cancelled/failed 时
    # 延迟 1 小时后删除临时图片（给用户重发缓冲）
```

---

## 9. 事件追踪

扩展上报的关键事件：

| 事件 | 触发时机 |
|------|---------|
| extension_installed | 扩展安装 |
| extension_opened | popup 打开 |
| task_fetched | 扩展拉取到任务 |
| page_opened | 打开小红书发布页 |
| login_detected | 检测到登录态 |
| login_required | 需要用户登录 |
| field_filled | 单个字段填充成功 |
| field_failed | 单个字段填充失败 |
| images_uploaded | 图片上传成功 |
| images_failed | 图片上传失败 |
| task_completed | 用户确认发布 |
| task_cancelled | 用户取消任务 |
| error_occurred | 发生错误 |

---

## 10. 环境变量

```env
# 发布任务
PUBLISH_TASK_TTL_SECONDS=86400
PUBLISH_TOKEN_TTL_SECONDS=600
PUBLISH_TOKEN_REFRESH_WINDOW_SECONDS=300

# 图片存储
TEMP_IMAGE_STORAGE_PROVIDER=s3
TEMP_IMAGE_BUCKET=xhs-ops-agent-temp
TEMP_IMAGE_URL_TTL_SECONDS=900
TEMP_IMAGE_MAX_SIZE_MB=10
TEMP_IMAGE_MAX_COUNT=9

# 限流
PUBLISH_TASK_CREATE_RATE_LIMIT=10/hour
PUBLISH_POLL_RATE_LIMIT=60/minute
PUBLISH_UPLOAD_RATE_LIMIT=20/hour

# 选择器配置
EXTENSION_SELECTOR_CACHE_TTL_SECONDS=3600
```

