# 小红书运营助手 — 生产环境部署指南

> 版本：v1.0  
> 日期：2026-09-01  
> 适用：Next.js 前端 + FastAPI 后端 + PostgreSQL + Redis + 浏览器插件

---

## 一、部署架构总览

```
                            用户
                             │
                             ▼
                    ┌─────────────────┐
                    │   CDN / Vercel  │  ← 前端部署（Next.js）
                    │   (SSL + 缓存)   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   API 域名       │  ← 后端入口
                    │   (Fly.io /      │
                    │    Railway /     │
                    │    阿里云 ECS)   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────────┐
        │ FastAPI  │   │ PostgreSQL│   │    Redis     │
        │ 服务实例  │   │  (RDS)   │   │  (Upstash/   │
        │          │   │          │   │   ElastiCache)│
        └──────────┘   └──────────┘   └──────────────┘
              │
              ▼
        ┌─────────────────────────────────────┐
        │ 第三方服务：LLM API / OSS / 支付 / 短信 │
        └─────────────────────────────────────┘
```

---

## 二、技术选型与服务商推荐

### 2.1 推荐组合（适合 MVP / 中小规模）

| 组件 | 推荐服务商 | 费用特点 | 适用场景 |
|------|-----------|----------|----------|
| 前端托管 | **Vercel** | 免费额度充足，按流量付费 | Next.js 最佳搭档 |
| 后端托管 | **Fly.io** / **Railway** | 按需付费，部署简单 | 中小规模，快速上线 |
| 数据库 | **Supabase** / **Neon** / **阿里云 RDS** | 免费/低价起步 | PostgreSQL 托管 |
| 缓存/队列 | **Upstash Redis** / **Railway Redis** | 免费额度足够 | Redis 托管 |
| 对象存储 | **阿里云 OSS** / **AWS S3** / **Cloudflare R2** | 按量付费 | 图片、静态资源 |
| 域名 | **Cloudflare** / 阿里云万网 | 低价 | DNS + SSL |
| 监控 | **Sentry** + **UptimeRobot** | 有免费额度 | 错误监控 + 可用性 |

### 2.2 大规模/国内合规组合

| 组件 | 推荐服务商 |
|------|-----------|
| 前端托管 | 阿里云 OSS + CDN / 腾讯云 COS + CDN |
| 后端托管 | 阿里云 ECS / 腾讯云 CVM / Kubernetes |
| 数据库 | 阿里云 RDS PostgreSQL / 腾讯云 TDSQL-C |
| 缓存 | 阿里云 Redis / 腾讯云 Redis |
| 对象存储 | 阿里云 OSS |
| 备案/域名 | 阿里云 / 腾讯云 |
| WAF/CDN | 阿里云 CDN + WAF |

---

## 三、环境变量配置

### 3.1 前端环境变量（Next.js）

```env
# apps/web/.env.production
NEXT_PUBLIC_API_BASE_URL=https://api.xhs-ops-agent.com
NEXT_PUBLIC_APP_NAME=小红书运营助手
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_xxx
```

### 3.2 后端环境变量（FastAPI）

```env
# apps/api/.env.production
APP_ENV=production
DEBUG=false

# Database
DATABASE_URL=postgresql://user:password@host:5432/xhs_ops_agent

# Redis
REDIS_URL=redis://default:password@host:6379

# JWT
SECRET_KEY=your-super-secret-key-min-32-characters
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# LLM APIs
DOUBAO_API_KEY=xxx
DOUBAO_MODEL=xxx
QWEN_API_KEY=xxx
DEEPSEEK_API_KEY=xxx
OPENAI_API_KEY=xxx

# Object Storage
OSS_ACCESS_KEY_ID=xxx
OSS_ACCESS_KEY_SECRET=xxx
OSS_BUCKET=xxx
OSS_ENDPOINT=xxx

# Payment
WECHAT_PAY_MCH_ID=xxx
WECHAT_PAY_API_KEY=xxx
ALIPAY_APP_ID=xxx

# Sentry
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### 3.3 环境变量管理原则

- 生产环境变量**绝不提交到 Git**，使用 `.env.production` 模板 + 安全存储。
- Vercel / Fly.io / Railway 都提供环境变量管理面板。
- 敏感密钥（JWT secret、API keys）使用密钥管理服务（如 AWS Secrets Manager / 阿里云 KMS）。

---

## 四、前端部署（Vercel）

### 4.1 部署步骤

1. **导入项目**
   - 登录 Vercel，点击 "Add New Project"。
   - 选择 GitHub 仓库 `yeluo253362792/xhs-ops-agent`。
   - 设置 Root Directory 为 `apps/web`。

2. **配置构建**
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. **配置环境变量**
   - 在 Vercel Dashboard → Settings → Environment Variables 中添加 `NEXT_PUBLIC_API_BASE_URL` 等。

4. **配置域名**
   - Settings → Domains → 添加自定义域名。
   - 在 DNS 服务商添加 CNAME 记录指向 Vercel。

### 4.2 Vercel 配置示例

```json
// apps/web/vercel.json
{
  "framework": "nextjs",
  "regions": ["hkg1"]
}
```

### 4.3 注意事项

- 如果前端和后端跨域，后端需要配置 CORS。
- 使用 Next.js Image Optimization 时，Vercel 有免费额度限制。
- 国内访问 Vercel 可能较慢，建议配合 Cloudflare CDN 或迁到国内云服务。

---

## 五、后端部署（Fly.io）

### 5.1 部署步骤

1. **安装 Fly CLI**

```bash
brew install flyctl
flyctl auth login
```

2. **初始化 Fly 应用**

```bash
cd apps/api
flyctl launch --name xhs-ops-agent-api --region hkg
```

3. **配置 `fly.toml`**

```toml
# apps/api/fly.toml
app = 'xhs-ops-agent-api'
primary_region = 'hkg'

[build]
  dockerfile = 'Dockerfile'

[env]
  APP_ENV = 'production'
  PORT = '8000'

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
  processes = ['app']

[[vm]]
  memory = '1gb'
  cpu_kind = 'shared'
  cpus = 1
```

4. **设置环境变量**

```bash
flyctl secrets set DATABASE_URL=postgresql://...
flyctl secrets set REDIS_URL=redis://...
flyctl secrets set SECRET_KEY=...
flyctl secrets set DOUBAO_API_KEY=...
```

5. **部署**

```bash
flyctl deploy
```

### 5.2 Dockerfile 示例

```dockerfile
# apps/api/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY . .

# 运行数据库迁移（可选，建议 CI/CD 中执行）
# RUN alembic upgrade head

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 5.3 使用 Railway 的替代方案

Railway 更适合不想写 Dockerfile 的团队：

1. 连接 GitHub 仓库。
2. 设置 Root Directory 为 `apps/api`。
3. 添加环境变量。
4. 自动部署。

---

## 六、数据库部署

### 6.1 使用 Supabase（推荐海外）

1. 创建 Supabase 项目。
2. 在 Connection Settings 中获取 `DATABASE_URL`。
3. 设置到后端环境变量。

### 6.2 使用 Neon（Serverless PostgreSQL）

1. 创建 Neon 项目。
2. 复制连接字符串。
3. 优势：按计算时间付费，适合开发和小规模。

### 6.3 使用阿里云 RDS（国内生产）

1. 购买 RDS PostgreSQL 实例。
2. 创建数据库和用户。
3. 配置白名单，允许后端服务器访问。
4. 开启自动备份。

### 6.4 数据库迁移

```bash
# 在本地或 CI/CD 中运行
cd apps/api
alembic upgrade head
```

生产环境建议在部署前执行迁移，而不是在容器启动时执行。

---

## 七、Redis 部署

### 7.1 Upstash Redis（推荐）

- Serverless Redis，免费额度足够早期使用。
- 支持 REST API，部分场景可直接从前端调用。

### 7.2 Railway / Fly.io Redis

- 与后端同平台部署，内网访问延迟低。

### 7.3 阿里云 Redis

- 国内生产推荐，性能稳定。

### 7.4 Redis 用途

- 用户每日生成次数限流
- JWT refresh token 黑名单
- 热门模板缓存
- Celery 任务队列
- LLM 结果缓存

---

## 八、浏览器插件发布

### 8.1 打包插件

```bash
cd extension
npm run build
# 输出为 extension/build/
```

### 8.2 发布到 Chrome Web Store

1. 注册 Chrome Web Store 开发者账号（一次性 $5）。
2. 在 Chrome Developer Dashboard 点击 "New Item"。
3. 上传 `build.zip`。
4. 填写商店信息：名称、描述、截图、隐私政策。
5. 提交审核，通常 1-3 个工作日。

### 8.3 Edge 浏览器商店

- 使用 Chrome Web Store 相同的包。
- 在 Microsoft Partner Center 提交。

### 8.4 插件更新

- 更新 `package.json` version。
- 重新打包上传。
- 用户浏览器会自动更新。

---

## 九、CI/CD 流程

### 9.1 GitHub Actions 工作流

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install Python deps
        run: |
          cd apps/api
          pip install -r requirements.txt
      
      - name: Run backend tests
        run: |
          cd apps/api
          pytest
      
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install web deps
        run: |
          cd apps/web
          npm install
      
      - name: Lint and type check
        run: |
          cd apps/web
          npm run lint
          npm run type-check

  deploy-web:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: vercel/action-deploy@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-api:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: |
          cd apps/api
          flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### 9.2 分支策略

- `main`：生产分支，合并后自动部署。
- `develop`：开发分支，用于日常开发。
- `feature/*`：功能分支。
- `hotfix/*`：紧急修复。

---

## 十、域名与 SSL

### 10.1 推荐域名结构

```
www.xhs-ops-agent.com      → 前端（Vercel）
api.xhs-ops-agent.com      → 后端（Fly.io）
docs.xhs-ops-agent.com     → 文档（Vercel/ReadMe）
status.xhs-ops-agent.com   → 状态页（UptimeRobot）
```

### 10.2 SSL 证书

- Vercel 和 Fly.io 自动提供 SSL。
- 使用 Cloudflare 时，可开启 Full (Strict) SSL 模式。
- 国内云服务需在控制台申请免费 SSL 证书。

### 10.3 CORS 配置

后端需要允许前端域名：

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://www.xhs-ops-agent.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 十一、监控与日志

### 11.1 应用监控

| 工具 | 用途 |
|------|------|
| **Sentry** | 前端/后端错误追踪 |
| **Logtail / Datadog** | 日志聚合与分析 |
| **UptimeRobot** | 服务可用性监控 |
| **Prometheus + Grafana** | 自定义指标（后期） |

### 11.2 关键监控指标

- API 响应时间（P95/P99）
- LLM 调用成功率和延迟
- 生成次数 / 付费转化率
- 合规检测命中率
- 插件安装量 / 活跃用户

### 11.3 告警策略

- API 5xx 错误率 > 1% 时告警
- 服务宕机 > 2 分钟时告警
- LLM 调用失败率 > 10% 时告警
- 数据库连接池耗尽时告警

---

## 十二、备份与灾难恢复

### 12.1 数据库备份

- 托管数据库服务通常提供自动备份。
- 建议每日备份，保留 7-30 天。
- 定期测试备份恢复流程。

### 12.2 代码与配置备份

- GitHub 仓库本身就是代码备份。
- 环境变量清单应加密存储在密码管理器（如 1Password / Bitwarden）。

### 12.3 灾难恢复 RPO/RTO

| 级别 | 目标 |
|------|------|
| RPO（数据丢失上限） | < 1 小时 |
| RTO（恢复时间） | < 30 分钟 |

---

## 十三、安全加固

### 13.1 网络安全

- 所有服务强制 HTTPS。
- 后端 API 不暴露公网 IP，只通过域名访问。
- 数据库不暴露公网，仅允许后端服务器内网访问。
- 使用 Cloudflare / WAF 防护 DDoS 和常见攻击。

### 13.2 应用安全

- JWT secret 定期轮换。
- API 限流防止滥用。
- 用户密码 bcrypt 哈希。
- 所有用户输入做校验和转义。

### 13.3 数据安全

- 小红书用户 session 不落地服务端。
- 敏感日志脱敏。
- 定期进行安全审计。

---

## 十四、成本估算

### 14.1 MVP 阶段月成本（海外方案）

| 项目 | 服务商 | 预估月费用 |
|------|--------|-----------|
| 前端托管 | Vercel Pro | $20 |
| 后端托管 | Fly.io | $10-30 |
| 数据库 | Supabase / Neon | $0-25 |
| Redis | Upstash | $0-10 |
| 对象存储 | Cloudflare R2 | $0-5 |
| 域名 | Cloudflare | $10-15/年 |
| Sentry | Sentry | $0-26 |
| LLM API | 豆包/通义 | $50-200（按量） |
| **总计** | | **约 $100-350/月** |

### 14.2 国内方案月成本

| 项目 | 服务商 | 预估月费用 |
|------|--------|-----------|
| 前端 CDN | 阿里云 | ¥50-200 |
| 后端 ECS | 阿里云 | ¥100-500 |
| RDS PostgreSQL | 阿里云 | ¥200-1000 |
| Redis | 阿里云 | ¥100-300 |
| OSS | 阿里云 | ¥50-200 |
| 域名 + 备案 | 阿里云 | ¥100/年 |
| **总计** | | **约 ¥500-2200/月** |

---

## 十五、部署检查清单

### 上线前检查

- [ ] 所有环境变量已配置
- [ ] 数据库迁移已执行
- [ ] Redis 连接正常
- [ ] LLM API 调用正常
- [ ] 前端能正常访问后端 API
- [ ] 登录/注册流程正常
- [ ] 生成笔记流程正常
- [ ] 合规检测正常
- [ ] 浏览器插件能导入内容
- [ ] 支付流程测试通过（沙箱环境）
- [ ] SSL 证书有效
- [ ] 监控和告警已配置
- [ ] 数据库备份已启用

---

## 十六、附录：一键部署脚本

```bash
#!/bin/bash
# deploy.sh - 生产部署脚本（简化版）

set -e

echo "=== 部署小红书运营助手 ==="

# 1. 数据库迁移
cd apps/api
alembic upgrade head

# 2. 部署后端
flyctl deploy

# 3. 部署前端
cd ../web
vercel --prod

echo "=== 部署完成 ==="
```

---

## 十七、参考文档

- [Vercel Docs](https://vercel.com/docs)
- [Fly.io Docs](https://fly.io/docs/)
- [Railway Docs](https://docs.railway.app/)
- [Supabase Docs](https://supabase.com/docs)
- [Chrome Web Store Publish](https://developer.chrome.com/docs/webstore/publish/)

---

> 本文档为生产环境部署指南，实际部署时请根据业务规模、用户地域和合规要求选择合适的服务商和配置。
