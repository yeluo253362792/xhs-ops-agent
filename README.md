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
