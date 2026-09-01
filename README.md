# 小红书运营助手

AI 辅助生成小红书爆款笔记的运营助手。

## 项目结构

```
xhs-ops-agent/
├── apps/
│   ├── web/              # Next.js 前端
│   └── api/              # FastAPI 后端
├── extension/            # 浏览器插件（Plasmo）
├── packages/shared/      # 共享类型和工具
├── prototype/            # UI 交互原型
├── docs/                 # 产品/技术文档
├── docker-compose.yml    # 本地开发环境
└── Makefile             # 常用命令
```

## 文档

- [PRD](docs/PRD.md) - 产品需求文档
- [竞品分析](docs/competitor-analysis-and-differentiation-strategy.md)
- [技术方案](docs/technical-design.md)
- [部署指南](docs/deployment-guide.md)

## 本地开发环境

### 前置要求

- Docker + Docker Compose
- Node.js 18+
- Python 3.11+

### 快速开始

```bash
# 1. 启动 PostgreSQL 和 Redis
docker-compose up -d

# 2. 安装后端依赖并运行测试
cd apps/api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pytest

# 3. 启动后端开发服务器
uvicorn app.main:app --reload

# 4. 安装前端依赖（新终端）
cd apps/web
npm install
npm run dev
```

访问：
- 前端：http://localhost:3000
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/docs

### 常用命令

```bash
make up        # 启动 Docker 服务
make down      # 停止 Docker 服务
make backend   # 安装后端依赖
make frontend  # 安装前端依赖
make test      # 运行后端测试
make dev-api   # 本地启动后端
make dev-web   # 本地启动前端
```

## 技术栈

- 前端：Next.js 14 + Tailwind CSS + TypeScript
- 后端：FastAPI + SQLAlchemy + PostgreSQL + Redis
- 浏览器插件：Plasmo
- 部署：Docker + Vercel + Fly.io

## 许可证

MIT

## 配置真实 LLM API（通义千问）

本项目默认使用 `mock` 模式生成内容，无需 API key。如需接入真实通义千问模型：

1. 前往 [阿里云百炼控制台](https://bailian.console.aliyun.com/) 申请 API Key。
2. 复制 `apps/api/.env.example` 为 `apps/api/.env`：

```bash
cp apps/api/.env.example apps/api/.env
```

3. 修改环境变量：

```bash
LLM_PROVIDER=qwen
LLM_API_KEY=your-dashscope-api-key
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-plus
```

4. 重启后端服务。

推荐模型：
- `qwen-plus`：性价比高，适合大多数场景
- `qwen-max`：能力最强，适合复杂创意
- `qwen-turbo`：速度最快，成本最低

## 通义千问 API 故障排查

如果配置真实 API 后生成失败，请按以下步骤排查：

### 1. 查看后端日志

启动后端时会输出详细日志，重点查看 LLM API 调用相关的错误信息：

```bash
cd apps/api
source venv/bin/activate
uvicorn app.main:app --reload
```

### 2. 测试 API 连通性

```bash
cd apps/api
source venv/bin/activate
python scripts/test_qwen.py
```

### 3. 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `401 Unauthorized` | API Key 无效或未激活 | 检查 `LLM_API_KEY` 是否正确，确认百炼控制台已开通模型服务 |
| `404 Not Found` | Base URL 错误 | 确认使用 `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `400 Bad Request` | 模型名称错误 | 使用 `qwen-plus`、`qwen-max` 或 `qwen-turbo` |
| 请求超时 | 网络问题 | 检查网络连接，尝试使用代理 |
| 返回格式异常 | 模型输出非 JSON | 检查模型是否支持 JSON 输出，或改用 `qwen-plus` |

### 4. 验证配置

```bash
cat apps/api/.env
```

确认包含：

```bash
LLM_PROVIDER=qwen
LLM_API_KEY=sk-xxx
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-plus
```

## 历史记录功能

登录后生成的笔记会自动保存到历史记录。历史记录支持：
- 查看过往生成的笔记
- 搜索和筛选（收藏）
- 收藏/取消收藏
- 删除

历史记录页面：http://localhost:3000/history

注意：当前 MVP 使用 mock 用户系统，所有登录用户共享同一个测试用户 ID。后续会替换为真实用户系统。

## Docker 镜像拉取失败处理

如果执行 `docker-compose up -d` 时报错 `failed to fetch anonymous token` 或 `i/o timeout`，说明 Docker Hub 访问受限。有两种解决方案：

### 方案 1：配置 Docker 镜像加速（推荐）

Docker Desktop 设置：

```json
{
  "registry-mirrors": [
    "https://<your-id>.mirror.aliyuncs.com",
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com"
  ]
}
```

获取阿里云镜像加速器地址：https://cr.console.aliyun.com/cn-hangzhou/instances/mirrors

### 方案 2：使用阿里云镜像地址

我已经在 `docker-compose.yml` 和 `Dockerfile` 中注释了阿里云镜像地址，取消注释即可：

```yaml
image: registry.cn-hangzhou.aliyuncs.com/library/postgres:16-alpine
```

```dockerfile
FROM registry.cn-hangzhou.aliyuncs.com/library/python:3.11-slim
```

### 方案 3：不用 Docker，本地安装 PostgreSQL + Redis

```bash
# macOS
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis

# 创建数据库
createdb xhs_ops_agent
```

然后直接启动后端：

```bash
cd apps/api
source venv/bin/activate
uvicorn app.main:app --reload
```
