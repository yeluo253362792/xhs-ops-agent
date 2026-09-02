# 浏览器扩展半自动发布技术方案

> 适用项目：小红书运营助手（xhs-ops-agent）  
> 版本：v1.0  
> 日期：2026-09-02

---

## 1. 概述

### 1.1 背景
小红书运营助手当前已在 Web 端实现「标题 + 正文 + 标签 + 封面文案」的 AI 生成能力，并支持历史记录持久化。为了进一步缩短“生成内容 → 发布到小红书”的路径，计划开发一款 Chrome 浏览器扩展，实现**半自动发布**：系统负责把内容搬运到小红书创作服务网页版并预填，最终发布动作由用户手动确认。

### 1.2 目标
- 用户在 Web App 生成内容后，可一键将内容推送到浏览器扩展
- 扩展自动在小红书创作服务平台（`creator.xiaohongshu.com`）发布页填充标题、正文、标签、图片
- 提供透明的人工确认机制：每个字段的填充状态可视化，失败字段支持手动补全
- 为后续“延迟提醒发布”“多平台发布”预留扩展能力

### 1.3 非目标
- 不实现完全自动点击“发布”按钮
- 不破解小红书的验证码、滑块等人机验证
- 不保存用户的小红书账号密码
- 暂不支持视频笔记、Safari/Firefox 浏览器

---

## 2. 架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                          用户浏览器                              │
│  ┌─────────────────┐         ┌───────────────────────────────┐  │
│  │  Web App        │         │  小红书运营助手扩展            │  │
│  │  (Next.js)      │         │  (Manifest V3 + React)        │  │
│  │                 │         │                               │  │
│  │  生成结果页      │         │  ┌──────────┐  ┌───────────┐  │  │
│  │  ↓ 创建任务      │         │  │  popup   │  │ 内容脚本  │  │  │
│  │                 │         │  │ 任务中心 │  │ 注入填充  │  │  │
│  └────────┬────────┘         │  └────┬─────┘  └─────┬─────┘  │  │
│           │                  │       │              │        │  │
│           │ HTTP             │       │ 本地消息     │        │  │
│           ▼                  │       ▼              ▼        │  │
│  ┌─────────────────┐         │  ┌──────────────────────────┐ │  │
│  │  后端 FastAPI    │◀────────┼──┤  Service Worker 轮询     │ │  │
│  │  任务队列        │         │  │ 拉取任务 / 状态上报      │ │  │
│  └────────┬────────┘         │  └──────────────────────────┘ │  │
│           │                  └───────────────────────────────┘  │
│           │                          │                          │
│           ▼                          ▼                          │
│  ┌─────────────────┐         ┌──────────────────────────────┐ │
│  │  PostgreSQL     │         │  creator.xiaohongshu.com     │ │
│  │  tasks / images │         │  发布页 DOM 操作 / 图片上传   │ │
│  └─────────────────┘         └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 用户操作流程

### 3.1 主路径：Web App 一键发布

```
1. 用户在 Web App 输入主题、受众、笔记类型，点击“生成笔记”
2. AI 返回标题、正文、标签、封面文案
3. 用户点击“发布到小红书”
4. Web App 弹出确认抽屉：
   - 展示内容摘要
   - 展示图片缩略图
   - 提示“请确认已安装浏览器扩展”
5. 用户确认后，后端创建 publish_task
6. 扩展 Service Worker 轮询拉取到新任务
7. 扩展图标显示红点 + 系统通知
8. 用户点击扩展 popup，查看任务列表
9. 用户点击“去发布”，扩展打开 creator.xiaohongshu.com 发布页
10. 扩展检测登录态：
    - 已登录：自动填充标题、正文、标签、图片
    - 未登录：提示用户扫码/密码登录，轮询检测登录成功后继续
11. 侧边栏显示每个字段的填充状态
12. 用户检查并手动点击小红书的“发布”按钮
13. 扩展将任务状态更新为 published，并回传后端
```

### 3.2 次路径：扩展内重新发布历史记录

```
1. 用户点击扩展图标打开 popup
2. popup 显示最近 7 天内的待发布/历史任务
3. 用户选择一条历史记录，点击“重新发布”
4. 后续流程与主路径步骤 9~13 一致
```

### 3.3 兜底路径：扩展未安装

```
1. 用户点击“发布到小红书”
2. Web App 检测到扩展未安装（通过 window.postMessage 探活超时）
3. 显示扩展安装引导页，提供：
   - 已解压扩展 .zip 下载链接
   - 图文安装步骤（Chrome 扩展管理 → 加载已解压）
4. 同时提供“复制文案 + 下载图片”手动发布方案
```

---

## 4. 扩展目录结构

```
extension/
├── public/
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon32.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── manifest.json
├── src/
│   ├── background/
│   │   └── service-worker.ts       # 轮询后端、任务调度、通知
│   ├── content/
│   │   ├── index.ts                # 内容脚本入口
│   │   ├── xhs-platform.ts         # 小红书页面检测与适配
│   │   ├── publisher-filler.ts     # 发布页填充逻辑
│   │   └── sidebar.tsx             # 注入的侧边栏 React 组件
│   ├── popup/
│   │   ├── App.tsx                 # popup 主界面
│   │   └── index.tsx
│   ├── shared/
│   │   ├── api.ts                  # 与后端通信
│   │   ├── auth.ts                 # Token / Cookie 读取
│   │   ├── storage.ts              # chrome.storage 封装
│   │   ├── types.ts                # 扩展内部类型
│   │   └── constants.ts
│   └── styles/
│       └── sidebar.css
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 5. Manifest V3 配置

```json
{
  "manifest_version": 3,
  "name": "小红书运营助手 - 一键发布",
  "version": "1.0.0",
  "description": "将小红书运营助手生成的内容半自动发布到小红书创作服务平台",
  "permissions": [
    "storage",
    "cookies",
    "activeTab",
    "notifications",
    "scripting",
    "background"
  ],
  "host_permissions": [
    "https://xhs-ops-agent.com/*",
    "https://creator.xiaohongshu.com/*",
    "https://www.xiaohongshu.com/*"
  ],
  "background": {
    "service_worker": "src/background/service-worker.ts",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://creator.xiaohongshu.com/*"],
      "js": ["src/content/index.ts"],
      "css": ["src/styles/sidebar.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "src/popup/index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "web_accessible_resources": [
    {
      "resources": ["assets/*"],
      "matches": ["https://creator.xiaohongshu.com/*"]
    }
  ]
}
```

---

## 6. 后端 API 设计

### 6.1 任务相关接口

#### 创建发布任务
```http
POST /api/v1/publish-tasks
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "content": {
    "titles": ["标题1", "标题2", "标题3"],
    "selected_title": "标题1",
    "body": "正文内容...",
    "tags": ["tag1", "tag2", "tag3"],
    "cover_text": "封面文案"
  },
  "images": [
    {"url": "https://cdn.example.com/temp/1.jpg", "filename": "cover.jpg"},
    {"url": "https://cdn.example.com/temp/2.jpg", "filename": "img2.jpg"}
  ],
  "platform": "xiaohongshu",
  "note_type": "图文笔记",
  "is_ai_generated": true
}
```

**响应：**
```json
{
  "id": "task_uuid",
  "status": "pending",
  "publish_token": "short-lived-token",
  "expires_at": "2026-09-03T10:00:00Z",
  "created_at": "2026-09-02T10:00:00Z"
}
```

#### 扩展轮询拉取任务
```http
GET /api/v1/publish-tasks/pending
Authorization: Bearer <publish_token>
```

**响应：**
```json
{
  "tasks": [
    {
      "id": "task_uuid",
      "status": "pending",
      "content": { ... },
      "images": [ ... ],
      "platform": "xiaohongshu",
      "created_at": "..."
    }
  ]
}
```

#### 更新任务状态
```http
PATCH /api/v1/publish-tasks/{task_id}
Authorization: Bearer <publish_token>
Content-Type: application/json

{
  "status": "prefilling",
  "progress": {
    "title": "success",
    "body": "success",
    "tags": "failed",
    "images": "pending"
  },
  "logs": [
    {"time": "...", "level": "info", "message": "标题填充成功"},
    {"time": "...", "level": "error", "message": "标签输入框未找到"}
  ]
}
```

### 6.2 扩展认证接口

```http
POST /api/v1/auth/extension-token
Authorization: Bearer <access_token>

{
  "device_info": "Chrome Extension 1.0.0"
}
```

**响应：**
```json
{
  "publish_token": "ext_xxx",
  "expires_in": 600
}
```

---

## 7. 数据库模型

### 7.1 publish_tasks 表

```sql
CREATE TABLE publish_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generation_history_id UUID REFERENCES generation_history(id),
    
    platform VARCHAR(50) NOT NULL DEFAULT 'xiaohongshu',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- pending / fetched / prefilling / waiting_user / published / cancelled / failed / expired
    
    content JSONB NOT NULL,
    -- {
    --   "titles": [...],
    --   "selected_title": "...",
    --   "body": "...",
    --   "tags": [...],
    --   "cover_text": "..."
    -- }
    
    images JSONB NOT NULL DEFAULT '[]',
    -- [
    --   {"url": "...", "filename": "...", "mime_type": "...", "size": 12345}
    -- ]
    
    progress JSONB DEFAULT '{}',
    -- {
    --   "title": "success|failed|pending",
    --   "body": "success|failed|pending",
    --   "tags": "success|failed|pending",
    --   "images": "success|failed|pending"
    -- }
    
    logs JSONB DEFAULT '[]',
    -- [{"time": "...", "level": "...", "message": "..."}]
    
    publish_token_hash VARCHAR(255),
    publish_token_expires_at TIMESTAMP,
    
    published_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    failed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_publish_tasks_user_status ON publish_tasks(user_id, status);
CREATE INDEX idx_publish_tasks_token ON publish_tasks(publish_token_hash);
CREATE INDEX idx_publish_tasks_expires ON publish_tasks(publish_token_expires_at);
```

### 7.2 publish_task_images 表（可选，用于独立管理临时图片）

```sql
CREATE TABLE publish_task_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES publish_tasks(id) ON DELETE CASCADE,
    original_url VARCHAR(500),
    storage_key VARCHAR(500) NOT NULL,
    filename VARCHAR(255),
    mime_type VARCHAR(100),
    size INTEGER,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_publish_task_images_task ON publish_task_images(task_id);
CREATE INDEX idx_publish_task_images_expires ON publish_task_images(expires_at);
```

---

## 8. 内容脚本注入策略

### 8.1 页面识别

扩展内容脚本只注入 `https://creator.xiaohongshu.com/*`，通过 URL 和 DOM 特征判断当前页面：

```typescript
// 页面类型检测
const PageType = {
  LOGIN: 'login',
  PUBLISH: 'publish',
  HOME: 'home',
  UNKNOWN: 'unknown'
};

function detectPageType(): PageType {
  const url = window.location.href;
  if (url.includes('/publish')) return PageType.PUBLISH;
  if (document.querySelector('.login-qrcode, .login-form')) return PageType.LOGIN;
  if (document.querySelector('.creator-home')) return PageType.HOME;
  return PageType.UNKNOWN;
}
```

### 8.2 元素选择器策略

采用“多选择器 + 优先级”策略，提升抗页面改版能力：

```typescript
const SELECTORS = {
  titleInput: [
    'input[placeholder*="标题"]',
    'textarea[placeholder*="标题"]',
    '[class*="title"] input',
    '[data-testid="note-title-input"]'
  ],
  bodyTextarea: [
    'textarea[placeholder*="正文"]',
    'div[contenteditable="true"][placeholder*="正文"]',
    '[class*="content"] textarea',
    '[data-testid="note-content-input"]'
  ],
  tagInput: [
    'input[placeholder*="标签"]',
    'input[placeholder*="话题"]',
    '[data-testid="note-tag-input"]'
  ],
  imageUpload: [
    'input[type="file"][accept*="image"]',
    '[data-testid="image-upload"] input[type="file"]',
    '[class*="upload"] input[type="file"]'
  ],
  publishButton: [
    'button:contains("发布")',
    '[data-testid="publish-button"]',
    '[class*="publish"] button'
  ]
};

function findElement(selectors: string[]): Element | null {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}
```

### 8.3 远程选择器配置

后端提供 `/api/v1/extension/selectors` 接口，返回当前推荐选择器：

```json
{
  "version": "2026-09-02-01",
  "selectors": {
    "titleInput": ["...", "..."],
    "bodyTextarea": ["...", "..."]
  }
}
```

扩展启动时拉取，缓存到 `chrome.storage.local`，每小时更新一次。

### 8.4 填充实现

```typescript
async function fillTitle(element: HTMLInputElement, title: string): Promise<boolean> {
  try {
    element.focus();
    element.value = title;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.blur();
    return true;
  } catch (err) {
    console.error('填充标题失败', err);
    return false;
  }
}

async function fillBody(element: HTMLElement, body: string): Promise<boolean> {
  // 处理 contenteditable div
  if (element.isContentEditable) {
    element.innerText = body;
    element.dispatchEvent(new InputEvent('input', { bubbles: true }));
    return true;
  }
  // 处理 textarea
  if (element instanceof HTMLTextAreaElement) {
    element.value = body;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  return false;
}
```

### 8.5 图片上传实现

```typescript
async function uploadImages(fileInput: HTMLInputElement, imageUrls: string[]): Promise<boolean> {
  try {
    const files: File[] = [];
    for (const url of imageUrls) {
      const response = await fetch(url);
      const blob = await response.blob();
      const filename = url.split('/').pop() || 'image.jpg';
      files.push(new File([blob], filename, { type: blob.type }));
    }
    
    const dataTransfer = new DataTransfer();
    files.forEach(f => dataTransfer.items.add(f));
    
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    return true;
  } catch (err) {
    console.error('图片上传失败', err);
    return false;
  }
}
```

---

## 9. 任务状态机

```
┌─────────┐    扩展拉取      ┌─────────┐    开始填充      ┌─────────────┐
│ pending │ ───────────────▶ │ fetched │ ──────────────▶ │ prefilling  │
└─────────┘                  └─────────┘                 └──────┬──────┘
     │                                                            │
     │ 24h 过期                                                     │ 填充完成
     ▼                                                            ▼
┌─────────┐                                               ┌─────────────┐
│ expired │                                               │ waiting_user│
└─────────┘                                               └──────┬──────┘
                                                                 │
                              ┌──────────────────────────────────┼──┐
                              │                                  │  │
                              ▼                                  ▼  ▼
                        ┌─────────┐    用户取消/失败        ┌─────────┐
                        │published│◀───────────────────────│ failed  │
                        └─────────┘                        └─────────┘
                              ▲
                              │
                        ┌─────────┐
                        │cancelled│
                        └─────────┘
```

### 状态说明

| 状态 | 说明 | 触发条件 |
|------|------|---------|
| pending | 等待扩展拉取 | Web App 创建任务后 |
| fetched | 扩展已拉取 | Service Worker 轮询获取 |
| prefilling | 正在填充 | 用户打开发布页，开始自动填充 |
| waiting_user | 等待用户确认 | 自动填充完成（无论成功与否） |
| published | 已发布 | 用户手动点击发布，扩展检测到发布成功或用户确认 |
| cancelled | 已取消 | 用户点击取消/放弃 |
| failed | 失败 | 严重错误无法继续 |
| expired | 已过期 | 超过 24 小时未处理 |

---

## 10. Service Worker 轮询策略

```typescript
// background/service-worker.ts
const POLL_INTERVALS = {
  HAS_TASKS: 3000,      // 有任务时 3 秒
  NO_TASKS: 30000,      // 无任务时 30 秒
  ERROR: 60000          // 连续失败时 60 秒
};

class TaskPoller {
  private interval: number = POLL_INTERVALS.NO_TASKS;
  private timer: number | null = null;
  private consecutiveErrors: number = 0;

  async poll() {
    try {
      const token = await this.getPublishToken();
      if (!token) {
        this.schedule(POLL_INTERVALS.NO_TASKS);
        return;
      }

      const tasks = await api.fetchPendingTasks(token);
      this.consecutiveErrors = 0;

      if (tasks.length > 0) {
        await this.notifyUser(tasks);
        this.schedule(POLL_INTERVALS.HAS_TASKS);
      } else {
        this.schedule(POLL_INTERVALS.NO_TASKS);
      }
    } catch (err) {
      this.consecutiveErrors++;
      this.schedule(POLL_INTERVALS.ERROR);
    }
  }

  private schedule(ms: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.poll(), ms);
  }
}
```

---

## 11. 安全与合规

### 11.1 认证安全
- 扩展不保存用户小红书账号密码
- 使用短期 `publish_token`（10 分钟有效期）拉取任务
- `publish_token` 只具备读取发布任务和上报状态的权限
- 完整 JWT 从同源 Cookie 读取，不持久化到扩展 storage

### 11.2 图片安全
- 临时图片使用预签名 URL，有效期 15 分钟
- OSS/S3 bucket 设置私有，禁止匿名访问
- 任务完成或过期后立即删除临时图片

### 11.3 内容合规
- 扩展侧边栏明确标注“内容由 AI 生成，请检查后再发布”
- 不绕过小红书任何内容审核机制
- 最终发布动作必须由用户手动完成

### 11.4 权限最小化
- 只申请必要的 host permissions
- `activeTab` 代替 `<all_urls>`
- 在扩展商店说明和安装引导中清晰说明权限用途

---

## 12. 错误处理与降级

### 12.1 错误分级

| 级别 | 场景 | 处理方式 |
|------|------|---------|
| info | 字段填充成功 | 侧边栏显示 ✅ |
| warning | 字段填充失败 | 侧边栏显示 ❌ + 原文可复制 |
| error | 图片上传失败 | 提示用户手动选择 |
| critical | 扩展未登录 / 小红书未登录 | 弹出指引，暂停任务 |
| fatal | 后端不可达 / 任务不存在 | 记录日志，指数退避重试 |

### 12.2 降级策略

```typescript
enum FillStrategy {
  AUTO,      // 自动 DOM 填充
  CLIPBOARD, // 剪贴板复制
  MANUAL     // 侧边栏显示原文，用户手动填写
}

const fallbackChain: Record<string, FillStrategy[]> = {
  title: [FillStrategy.AUTO, FillStrategy.CLIPBOARD],
  body: [FillStrategy.AUTO, FillStrategy.CLIPBOARD],
  tags: [FillStrategy.AUTO, FillStrategy.CLIPBOARD],
  images: [FillStrategy.AUTO, FillStrategy.MANUAL]
};
```

---

## 13. 测试策略

### 13.1 单元测试
- 内容脚本选择器匹配逻辑
- 任务状态机流转
- 图片 URL 到 File 对象转换

### 13.2 集成测试
- 扩展与后端 API 通信
- Web App 创建任务 → 扩展拉取 → 填充的端到端流程

### 13.3 手动测试清单
- [ ] 扩展安装/加载
- [ ] Web App 检测到扩展已安装
- [ ] 未安装扩展时的引导页
- [ ] 已登录小红书时的自动填充
- [ ] 未登录小红书时的登录引导
- [ ] 字段填充失败时的侧边栏状态
- [ ] 图片上传成功/失败
- [ ] 任务状态正确回传后端
- [ ] 24 小时过期任务清理

### 13.4 兼容性测试
- Chrome 最新版
- Chrome 测试版
- Edge（后续）
- 小红书创作服务平台页面改版后的回归测试

---

## 14. 部署与分发

### 14.1 开发阶段
```bash
cd extension
npm install
npm run dev        # Vite 热更新模式
# Chrome 扩展管理 → 加载已解压 → 选择 extension/dist
```

### 14.2 内测阶段
- GitHub Release 提供 `extension-v1.0.0.zip`
- Web App 显示安装引导
- 收集用户反馈迭代

### 14.3 正式上架
- 注册 Chrome Web Store 开发者账号（$5 一次性）
- 准备素材：图标、截图、宣传图、隐私政策链接
- 提交审核（通常 1-3 个工作日）

---

## 15. 环境变量配置

### 15.1 扩展构建时
```env
# .env
VITE_API_BASE_URL=https://api.xhs-ops-agent.com
VITE_WEB_APP_URL=https://xhs-ops-agent.com
VITE_EXTENSION_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 15.2 后端新增配置
```env
# 发布任务
PUBLISH_TASK_TTL_SECONDS=86400          # 24 小时
PUBLISH_TOKEN_TTL_SECONDS=600           # 10 分钟
PUBLISH_POLL_INTERVAL_MS=3000           # 扩展轮询间隔提示

# 临时图片存储
TEMP_IMAGE_STORAGE_PROVIDER=s3          # s3 / aliyun-oss
TEMP_IMAGE_BUCKET=xhs-ops-agent-temp
TEMP_IMAGE_URL_TTL_SECONDS=900          # 15 分钟
TEMP_IMAGE_MAX_SIZE_MB=10

# 远程选择器
EXTENSION_SELECTOR_CACHE_TTL_SECONDS=3600
```

---

## 16. 风险与应对

| 风险 | 影响 | 可能性 | 应对措施 |
|------|------|--------|---------|
| 小红书改版导致选择器失效 | 填充失败 | 高 | 多选择器策略 + 远程配置 + 降级手动 |
| 小红书增加反爬/人机验证 | 自动填充被拦截 | 中 | 检测到验证时暂停，提示用户手动完成 |
| 扩展权限申请过多导致用户流失 | 安装率低 | 中 | 清晰说明权限用途，按需申请 |
| 图片跨域下载失败 | 图片上传失败 | 中 | 后端配置 CORS，扩展降级提示手动上传 |
| 用户误发违规内容 | 账号/法律风险 | 中 | 强制用户确认 + AI 合规检测前置 |
| Chrome Web Store 审核不通过 | 无法官方分发 | 中 | 准备隐私政策，避免自动化点击发布 |
| 后端任务堆积 | 存储成本增加 | 低 | 定时清理过期任务和临时图片 |

---

## 17. 与现有系统的接口

### 17.1 依赖的现有能力
- 用户认证系统（真实用户 JWT）
- AI 生成服务（生成标题/正文/标签/封面文案）
- 历史记录服务（generation_history 表）
- 文件/图片存储服务（需要新增或复用）

### 17.2 需要新增的后端模块
- `app/routers/publish_tasks.py` — 发布任务 API
- `app/services/publish_task_service.py` — 任务状态机
- `app/services/temp_image_service.py` — 临时图片上传/清理
- `app/tasks/cleanup.py` — 定时清理任务
- `app/models/publish_task.py` — 数据模型

### 17.3 需要新增的前端能力
- 生成结果页“发布到小红书”按钮
- 发布确认抽屉组件
- 扩展安装检测与引导

---

## 18. 后续扩展方向

1. **延迟提醒发布**：用户设置时间，到点后扩展发送通知
2. **多平台发布**：同一内容发布到小红书、抖音、微博等
3. **发布数据分析**：读取小红书创作者中心数据，回流到运营助手
4. **模板库**：保存常用发布模板，快速套用
5. **手机 App 接力**：通过二维码/Deep Link 把内容传到手机小红书 App

