# 小红书运营助手 — 技术方案设计

> 版本：v1.0  
> 日期：2026-09-01  
> 范围：覆盖 PRD 中 P0/P1/P2 全部功能

---

## 一、设计目标与约束

### 1.1 设计目标

- **快速验证**：MVP 2-3 周内可运行，支持核心生成流程。
- **可扩展**：支持从个人用户扩展到 MCN/品牌 SaaS。
- **安全合规**：用户数据隔离、小红书账号凭证不落地服务端。
- **成本可控**：按量付费的 LLM +  Serverless 部署，降低早期成本。

### 1.2 约束条件

| 约束 | 说明 |
|------|------|
| 小红书无公开发布 API | 发布功能依赖浏览器插件本地执行或 RPA |
| 内容合规要求高 | 需要敏感词、高风险类目、广告声明检测 |
| 用户数据隐私 | 小红书 session 不存储在服务端 |
| 团队规模小 | 优先选择全栈友好、生态成熟的技术栈 |

---

## 二、总体技术架构

### 2.1 架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                用户层                                        │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────────────────┐   │
│  │   Web App    │  │ Browser Plugin  │  │    Mobile Web（未来）         │   │
│  │  (Next.js)   │  │   (Plasmo)      │  │                              │   │
│  └──────┬───────┘  └────────┬────────┘  └──────────────┬───────────────┘   │
└─────────┼──────────────────┼──────────────────────────┼───────────────────┘
          │                  │                          │
          ▼                  ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              接入层 / CDN                                    │
│                    Vercel Edge / Cloudflare / Nginx                         │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              后端服务层                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         API Gateway (FastAPI)                        │    │
│  │  /auth  /generate  /compliance  /templates  /history  /analytics     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                     │                                       │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────────┐    │
│  │  Business Logic │  │  Compliance      │  │  Analytics / Batch      │    │
│  │  Services       │  │  Engine          │  │  Services               │    │
│  └────────┬────────┘  └────────┬─────────┘  └───────────┬─────────────┘    │
│           │                    │                        │                  │
│  ┌────────▼────────┐  ┌────────▼─────────┐  ┌───────────▼─────────────┐    │
│  │  Prompt Mgmt    │  │  Rule Engine     │  │  Background Workers     │    │
│  │  Template Mgmt  │  │  Trie / Regex    │  │  (Celery / RQ)          │    │
│  └─────────────────┘  └──────────────────┘  └─────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              数据与 AI 层                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ PostgreSQL   │  │    Redis     │  │  LLM APIs    │  │ Object Store │   │
│  │ (主数据库)    │  │ (缓存/任务)   │  │ 豆包/通义/DS │  │  S3 / OSS    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈总览

| 层级 | 选型 | 备选 |
|------|------|------|
| 前端框架 | Next.js 14 (App Router) | Nuxt 3 |
| UI 组件 | shadcn/ui + Tailwind CSS | Ant Design |
| 状态管理 | Zustand + React Query | Redux Toolkit |
| 后端框架 | FastAPI (Python) | NestJS / Go |
| 数据库 | PostgreSQL | MySQL |
| 缓存 | Redis | Valkey |
| 任务队列 | Celery + Redis | RQ |
| LLM 调用 | 豆包 / 通义千问 / DeepSeek API | OpenAI / Claude |
| 浏览器插件 | Plasmo | WXT / 原生 Manifest V3 |
| 对象存储 | 阿里云 OSS / AWS S3 | Cloudflare R2 |
| 部署 | Vercel（前端）+ Fly.io/Railway（后端） | 阿里云 ECS |
| 监控 | Sentry + Logtail | DataDog |

---

## 三、前端技术方案

### 3.1 选型理由

| 技术 | 理由 |
|------|------|
| **Next.js 14 App Router** | React 生态成熟、SSR/SSG 灵活、Vercel 部署方便、对 SEO 友好 |
| **Tailwind CSS** | 原子化样式，快速构建一致 UI，减少 CSS 维护成本 |
| **shadcn/ui** | 基于 Radix UI，可定制性强，组件源码可直接修改 |
| **Zustand** | 轻量状态管理，适合中小型应用 |
| **React Query** | 服务端状态管理、缓存、重试、分页都很方便 |

### 3.2 页面与路由

| 路由 | 页面 | 对应功能 |
|------|------|----------|
| `/` | 生成笔记 | P0 核心生成页 |
| `/batch` | 批量生成 | P2 |
| `/templates` | 模板库 | P1 |
| `/history` | 历史记录 | P0 |
| `/compliance` | 合规检测 | P0/P2 |
| `/analytics` | 数据复盘 | P2 |
| `/publish` | 一键发布 | P1/P2 |
| `/account` | 账户与订阅 | P0 |

### 3.3 前端模块结构

```
app/
├── page.tsx                    # 生成页（首页）
├── layout.tsx                  # 根布局
├── batch/page.tsx              # 批量生成
├── templates/page.tsx          # 模板库
├── history/page.tsx            # 历史记录
├── compliance/page.tsx         # 合规检测
├── analytics/page.tsx          # 数据复盘
├── publish/page.tsx            # 一键发布
├── account/page.tsx            # 账户与订阅
├── components/
│   ├── GenerateForm.tsx        # 生成表单
│   ├── ResultTabs.tsx          # 结果 Tab 切换
│   ├── TitleSelector.tsx       # 标题选择
│   ├── ComplianceBadge.tsx     # 合规状态标签
│   ├── TemplateCard.tsx        # 模板卡片
│   ├── HistoryItem.tsx         # 历史记录项
│   └── SubscriptionPlans.tsx   # 订阅计划
├── hooks/
│   ├── useGenerate.ts          # 生成接口 hook
│   ├── useHistory.ts           # 历史记录 hook
│   └── useAuth.ts              # 认证 hook
├── lib/
│   ├── api.ts                  # API 客户端
│   └── constants.ts            # 常量
└── stores/
    ├── authStore.ts            # 用户状态
    └── generateStore.ts        # 生成状态
```

### 3.4 关键交互设计

- **生成流程**：表单提交 → loading → 结果展示（Tab 切换）→ 复制/保存/插件导入。
- **批量生成**：多行文本输入 → 后台并行生成 → 结果卡片列表。
- **模板库**：分类筛选 → 点击应用 → 跳转生成页并填充参数。
- **历史记录**：localStorage / API 双写，支持离线缓存。

---

## 四、后端技术方案

### 4.1 选型理由

| 技术 | 理由 |
|------|------|
| **FastAPI** | Python 生态与 AI 库结合紧密，异步性能优秀，自动生成 OpenAPI 文档 |
| **PostgreSQL** | 关系型数据为主，JSONB 支持灵活的生成结果存储 |
| **Redis** | 缓存热点数据、限流、任务队列、session 管理 |
| **Celery** | 异步处理批量生成、合规检测、数据分析等耗时任务 |

### 4.2 后端模块结构

```
backend/
├── app/
│   ├── main.py                 # FastAPI 应用入口
│   ├── api/
│   │   ├── auth.py             # 认证接口
│   │   ├── generate.py         # 生成接口
│   │   ├── compliance.py       # 合规检测接口
│   │   ├── templates.py        # 模板接口
│   │   ├── history.py          # 历史记录接口
│   │   ├── batch.py            # 批量生成接口
│   │   ├── analytics.py        # 数据分析接口
│   │   └── publish.py          # 发布相关接口
│   ├── services/
│   │   ├── llm_service.py      # LLM 调用封装
│   │   ├── prompt_service.py   # Prompt 管理
│   │   ├── compliance_service.py # 合规检测
│   │   ├── template_service.py # 模板管理
│   │   └── analytics_service.py # 数据分析
│   ├── models/
│   │   ├── user.py
│   │   ├── generation.py
│   │   ├── template.py
│   │   └── compliance_rule.py
│   ├── schemas/
│   │   └── # Pydantic schemas
│   ├── core/
│   │   ├── config.py           # 配置管理
│   │   ├── security.py         # JWT/密码
│   │   └── dependencies.py     # 依赖注入
│   └── tasks/
│       └── batch_tasks.py      # Celery 任务
├── alembic/                    # 数据库迁移
├── tests/
└── requirements.txt
```

### 4.3 API 设计要点

已在 PRD 中定义，补充说明：

- **认证**：JWT + refresh token，access token 有效期 15 分钟，refresh token 7 天。
- **限流**：免费用户每日 3 次，基于 Redis 计数器。
- **生成接口**：异步调用 LLM，超时 30 秒，失败重试 2 次。
- **批量接口**：提交任务返回 task_id，前端轮询进度。
- **合规接口**：同步返回，响应时间 < 500ms。

---

## 五、数据库设计

### 5.1 ER 图（文字描述）

```
User 1:N Generation
User 1:N Subscription
User 1:N Payment
User 1:N PublishTask
Template 1:N Generation (optional)
ComplianceRule N:M Generation (via generation_compliance_results)
```

### 5.2 核心表结构

#### users（用户表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 用户 ID |
| email | VARCHAR(255) UNIQUE | 邮箱 |
| phone | VARCHAR(20) UNIQUE | 手机号 |
| password_hash | VARCHAR(255) | bcrypt 哈希 |
| nickname | VARCHAR(100) | 昵称 |
| avatar_url | VARCHAR(500) | 头像 |
| subscription_tier | VARCHAR(20) | free / basic / pro |
| daily_quota | INT | 每日剩余次数 |
| quota_reset_at | TIMESTAMP | 配额重置时间 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

#### generations（生成记录表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 记录 ID |
| user_id | UUID FK | 用户 ID |
| template_id | UUID FK NULL | 模板 ID |
| topic | VARCHAR(255) | 主题 |
| audience | VARCHAR(255) | 目标受众 |
| content_type | VARCHAR(50) | 笔记类型 |
| tone | VARCHAR(50) | 语气风格 |
| extra_info | TEXT NULL | 补充信息 |
| generated_content | JSONB | 完整生成结果 |
| compliance_result | JSONB | 合规检测结果 |
| is_favorite | BOOLEAN | 是否收藏 |
| is_deleted | BOOLEAN | 软删除 |
| created_at | TIMESTAMP | 创建时间 |

#### templates（模板表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 模板 ID |
| category | VARCHAR(50) | 品类 |
| content_type | VARCHAR(50) | 笔记类型 |
| name | VARCHAR(100) | 名称 |
| description | VARCHAR(255) | 描述 |
| prompt_template | TEXT | Prompt 模板 |
| example_input | JSONB | 示例输入 |
| example_output | JSONB | 示例输出 |
| is_premium | BOOLEAN | 是否会员专享 |
| is_active | BOOLEAN | 是否启用 |

#### compliance_rules（合规规则表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 规则 ID |
| rule_type | VARCHAR(20) | keyword / regex / category |
| pattern | VARCHAR(255) | 关键词或正则 |
| risk_level | VARCHAR(20) | low / medium / high |
| category | VARCHAR(50) | 类目 |
| suggestion | TEXT | 修改建议 |
| is_active | BOOLEAN | 是否启用 |
| updated_at | TIMESTAMP | 更新时间 |

#### subscriptions（订阅表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 订阅 ID |
| user_id | UUID FK | 用户 ID |
| plan | VARCHAR(20) | free / basic / pro |
| status | VARCHAR(20) | active / cancelled / expired |
| started_at | TIMESTAMP | 开始时间 |
| expires_at | TIMESTAMP | 过期时间 |
| payment_id | VARCHAR(100) | 支付平台订单号 |

#### publish_tasks（发布任务表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 任务 ID |
| user_id | UUID FK | 用户 ID |
| generation_id | UUID FK | 生成记录 ID |
| status | VARCHAR(20) | pending / running / success / failed |
| scheduled_at | TIMESTAMP | 计划发布时间 |
| published_at | TIMESTAMP | 实际发布时间 |
| error_msg | TEXT | 错误信息 |

### 5.3 索引设计

- `users(email)`, `users(phone)`：唯一索引
- `generations(user_id, created_at DESC)`：用户历史查询
- `generations(is_favorite, user_id)`：收藏查询
- `compliance_rules(rule_type, is_active)`：规则加载
- `publish_tasks(user_id, status)`：发布队列查询

---

## 六、AI / LLM 服务层

### 6.1 LLM 选型

| 模型 | 适用场景 | 优先级 |
|------|----------|--------|
| **豆包** | 中文小红书风格文案，字节生态 | 首选 |
| **通义千问** | 中文理解强，阿里生态 | 备选 |
| **DeepSeek-V2** | 性价比高，长文本 | 备选 |
| **GPT-4o** | 复杂创意、多语言 | 高阶功能 |

### 6.2 Prompt 工程架构

```
System Prompt (小红书专家角色)
    ├── 平台调性约束
    ├── 合规约束
    └── 输出格式约束
        └── User Input (topic + audience + type + tone)
            └── Dynamic Template (基于 content_type)
                └── Few-shot Examples
```

### 6.3 Prompt 管理方案

- 模板化存储在数据库 `templates` 表。
- 系统级 prompt 放在代码仓库 `backend/prompts/`。
- 支持 A/B 测试不同 prompt 版本。
- 输出格式强制 JSON，便于解析。

### 6.4 生成流程

```python
async def generate_note(request: GenerateRequest):
    # 1. 校验用户配额
    check_quota(user_id)
    
    # 2. 构建 prompt
    prompt = build_prompt(request)
    
    # 3. 调用 LLM
    raw_output = await llm_service.generate(prompt)
    
    # 4. 解析输出
    content = parse_json_output(raw_output)
    
    # 5. 合规检测
    compliance = compliance_service.check(content)
    
    # 6. 拦截高风险内容
    if compliance.level == 'high':
        return error_response(compliance)
    
    # 7. 保存记录并返回
    generation = await save_generation(user_id, content, compliance)
    return generation
```

### 6.5 输出 JSON 格式

```json
{
  "topic": "油皮夏季护肤",
  "titles": ["...", "...", "..."],
  "body": "...",
  "tags": ["#...", "#..."],
  "cover_text": "...",
  "cover_design": ["...", "..."],
  "image_script": [
    {"content": "...", "desc": "...", "text": "..."}
  ],
  "publish_suggestions": {
    "best_time": "20:00-22:00",
    "interaction_prompt": "..."
  }
}
```

---

## 七、合规引擎设计

### 7.1 架构

```
输入文本
   │
   ▼
[预处理器] —— 去特殊符号、统一空格、繁简转换
   │
   ▼
[规则引擎]
   ├── Trie 树敏感词匹配
   ├── 正则规则（联系方式、外链、导流）
   ├── 高风险类目分类器
   └── 广告意图识别器
   │
   ▼
[评分器] —— 综合风险等级 + 分项评分
   │
   ▼
[建议生成器] —— 返回修改建议
```

### 7.2 技术实现

| 模块 | 实现 |
|------|------|
| 敏感词匹配 | pyahocorasick / 自研 Trie |
| 正则匹配 | Python re / regex |
| 意图分类 | 轻量 LLM prompt 或小模型 |
| 规则热更新 | 数据库 + Redis 缓存 + 定时刷新 |

### 7.3 规则分类

| 类型 | 示例 | 处理 |
|------|------|------|
| 极限词 | 第一、最好、根治 | 标红 + 替换建议 |
| 医疗功效 | 祛斑、美白、治疗 | 高风险拦截 |
| 金融收益 | 稳赚、保本、收益率 | 高风险拦截 |
| 外部导流 | 微信、手机号、二维码 | 标红 + 删除建议 |
| 广告声明 | 品牌/价格/优惠 | 提示添加 #合作 |

### 7.4 性能目标

- 单次文本检测 < 100ms
- 规则库支持 10,000+ 关键词
- 支持热更新，无需重启服务

---

## 八、浏览器插件架构

### 8.1 选型

| 技术 | 理由 |
|------|------|
| **Plasmo** | React + TypeScript 友好，支持热更新，自动处理 Manifest |
| **Manifest V3** | Chrome 商店新政策要求 |

### 8.2 插件结构

```
extension/
├── src/
│   ├── background/           # Service Worker
│   │   └── index.ts          # 管理本地 session、与后端通信
│   ├── content/              # Content Script
│   │   └── xiaohongshu.ts    # 注入小红书发布页
│   ├── popup/                # 插件弹窗
│   │   └── index.tsx
│   └── options/              # 插件设置页
│       └── index.tsx
├── package.json
└── package.config.ts
```

### 8.3 安全设计

- 小红书账号 cookie/session **只保存在插件本地**，不上传服务端。
- 与后端通信时使用 HTTPS + JWT。
- 发布操作必须用户确认，不可静默自动发布（半自动模式）。
- P2 自动发布模式需用户明确授权，并在插件中本地执行 RPA。

### 8.4 半自动发布流程

```
用户打开小红书创作服务平台
   │
   ▼
插件检测发布页 URL
   │
   ▼
注入「从助手导入」按钮
   │
   ▼
用户点击按钮 → 插件调用后端获取历史记录列表
   │
   ▼
用户选择笔记 → 插件自动填入标题、正文、标签
   │
   ▼
用户手动上传封面图 → 用户点击发布
```

### 8.5 P2 自动发布流程（本地 RPA）

```
用户授权并开启自动发布
   │
   ▼
插件本地保存小红书 session
   │
   ▼
后端下发发布任务到插件
   │
   ▼
插件在本地浏览器中模拟点击发布
   │
   ▼
返回发布结果给后端
```

---

## 九、第三方服务集成

### 9.1 支付

| 服务 | 用途 |
|------|------|
| 微信支付 / 支付宝 | 订阅付费 |
| Stripe | 海外用户（可选） |

### 9.2 短信/邮件

| 服务 | 用途 |
|------|------|
| 阿里云短信 / 腾讯云短信 | 手机号验证码 |
| Resend / SendGrid | 邮件通知 |

### 9.3 对象存储

| 服务 | 用途 |
|------|------|
| 阿里云 OSS / AWS S3 | 用户头像、AI 生成图片、模板封面 |

### 9.4 AI 图片生成（P2）

| 服务 | 用途 |
|------|------|
| Midjourney API / Stable Diffusion / DALL-E 3 | AI 封面生成 |

### 9.5 监控与日志

| 服务 | 用途 |
|------|------|
| Sentry | 前端/后端错误监控 |
| Logtail / Loki | 日志聚合 |
| UptimeRobot | 服务可用性监控 |

---

## 十、安全设计

### 10.1 认证与授权

- JWT access token + refresh token。
- 密码使用 bcrypt 哈希，salt rounds = 12。
- 敏感接口（生成、批量、发布）需登录。
- 用户只能访问自己的数据。

### 10.2 数据安全

- 数据库连接使用 SSL。
- 用户小红书 session 不存储在服务端。
- 敏感字段（password_hash, tokens）不返回给前端。
- 定期备份数据库。

### 10.3 内容安全

- 用户输入做 XSS 过滤。
- LLM 输出做 HTML 转义。
- 文件上传限制类型和大小。

### 10.4 合规安全

- 用户协议明确 AI 生成内容责任归属。
- 高风险内容强制拦截，不可发布。
- 遵守《生成式人工智能服务管理暂行办法》。

---

## 十一、性能与扩展性

### 11.1 性能目标

| 指标 | 目标 |
|------|------|
| 单次生成耗时 | < 5 秒（90%） |
| 合规检测耗时 | < 200ms |
| 页面首屏加载 | < 2 秒 |
| API 响应时间（非 LLM） | < 100ms |

### 11.2 优化策略

- **缓存**：模板列表、合规规则、热门生成结果缓存到 Redis。
- **CDN**：静态资源、图片使用 CDN 加速。
- **数据库连接池**：PostgreSQL 连接池大小 20-50。
- **异步处理**：批量生成、数据分析走 Celery。
- **LLM 优化**：
  - 使用流式输出提升感知速度
  - 对热门主题预生成结果
  - 设置超时和重试机制

### 11.3 水平扩展

- 后端服务无状态，可部署多个实例。
- Redis 作为共享缓存和 session 存储。
- Celery worker 可独立扩展。
- 数据库读写分离（后期）。

---

## 十二、部署与运维

### 12.1 部署架构

```
                    用户
                     │
                     ▼
              Vercel / CDN
                     │
                     ▼
              Load Balancer
                     │
         ┌──────────┼──────────┐
         ▼          ▼          ▼
      API 1       API 2       API 3   (FastAPI)
         │          │          │
         └──────────┼──────────┘
                    ▼
              PostgreSQL + Redis
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
     Celery Worker         LLM APIs
```

### 12.2 环境划分

| 环境 | 用途 | 部署位置 |
|------|------|----------|
| Local | 本地开发 | Docker Compose |
| Dev | 联调测试 | Railway / Fly.io |
| Staging | 预发布 | Vercel + Fly.io |
| Production | 生产 | Vercel + Fly.io / 阿里云 |

### 12.3 CI/CD

- **GitHub Actions**：
  - 提交时运行 lint、类型检查、单元测试。
  - 合并到 main 后自动部署到 Staging。
  - 打 tag 后自动部署到 Production。

### 12.4 容器化

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 12.5 数据库迁移

- 使用 Alembic 管理数据库迁移。
- 部署前自动执行 `alembic upgrade head`。

---

## 十三、开发阶段与里程碑

### 13.1 阶段划分

| 阶段 | 时间 | 目标 |
|------|------|------|
| **Phase 1** | 第 1 周 | 项目初始化、数据库设计、基础 API |
| **Phase 2** | 第 2-3 周 | 生成页、合规检测、用户系统、历史记录 |
| **Phase 3** | 第 4-5 周 | 模板库、浏览器插件半自动发布 |
| **Phase 4** | 第 6-7 周 | 对标分析、批量生成、数据复盘 |
| **Phase 5** | 第 8-10 周 | 真正一键发布、合规评分、AI 封面生成 |
| **Phase 6** | 第 11-12 周 | 支付订阅、灰度发布、性能优化 |

### 13.2 MVP 范围（Phase 1-2）

- Web 生成页
- 用户注册/登录
- LLM 文案生成
- 合规检测
- 历史记录

---

## 十四、项目目录结构

```
xhs-ops-agent/
├── docs/
│   ├── PRD.md
│   ├── competitor-analysis-and-differentiation-strategy.md
│   └── technical-design.md
├── prototype/
│   ├── index.html
│   └── README.md
├── apps/
│   ├── web/                    # Next.js 前端
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── stores/
│   │   ├── package.json
│   │   └── tailwind.config.ts
│   └── api/                    # FastAPI 后端
│       ├── app/
│       ├── alembic/
│       ├── tests/
│       ├── requirements.txt
│       └── Dockerfile
├── extension/                  # 浏览器插件
│   ├── src/
│   ├── package.json
│   └── package.config.ts
├── packages/
│   └── shared/                 # 共享类型、工具函数
│       ├── types/
│       └── utils/
├── docker-compose.yml          # 本地开发环境
├── README.md
└── .github/
    └── workflows/
        └── ci.yml
```

---

## 十五、关键技术决策记录（ADRs）

### ADR-001：前后端分离 vs 全栈框架

**决策**：前后端分离，前端 Next.js，后端 FastAPI。

**理由**：
- 团队可独立迭代前后端。
- FastAPI 与 Python AI 生态结合更好。
- Next.js 支持 SSR 和静态导出，适合 SEO 和快速迭代。

### ADR-002：PostgreSQL vs MongoDB

**决策**：使用 PostgreSQL，JSONB 存储生成结果。

**理由**：
- 关系型数据（用户、订阅、模板）更适合 SQL。
- JSONB 可灵活存储生成内容，避免 schema 频繁变更。
- 事务支持强，便于订阅支付等场景。

### ADR-003：自研合规引擎 vs 第三方审核 API

**决策**：MVP 自研合规引擎，P2 可接入第三方作为补充。

**理由**：
- 小红书规则特殊，自研更灵活。
- 自研成本低，便于快速迭代。
- 第三方 API 作为二次校验，提升准确率。

### ADR-004：浏览器插件本地保存 Session

**决策**：小红书 session 仅保存在浏览器插件本地，不上传服务端。

**理由**：
- 避免服务端存储用户账号凭证，降低安全风险。
- 符合平台合规要求，减少法律风险。
- 用户信任度更高。

### ADR-005：LLM 多模型策略

**决策**：优先使用豆包/通义千问/DeepSeek，复杂场景使用 GPT-4o。

**理由**：
- 中文小红书文案效果更好。
- 成本低于 GPT-4o。
- 多模型可作为 fallback，提升可用性。

---

## 十六、风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| LLM 输出不稳定 | 生成质量波动 | Prompt 工程 + 输出解析 + 多候选 |
| LLM 成本上升 | 运营成本增加 | 缓存热门结果 + 模型降级策略 |
| 小红书政策变化 | 发布功能失效 | 紧跟政策，规则库热更新 |
| 自动发布封号风险 | 用户流失/投诉 | 默认半自动，自动发布需用户明确授权 |
| 通用 AI 竞争 | 产品差异化被削弱 | 做深工作流、合规、数据飞轮 |
| 数据安全事件 | 品牌受损/法律风险 | 凭证不上云、加密存储、定期审计 |

---

## 十七、附录

### 17.1 推荐开发环境

- **Node.js**：18+
- **Python**：3.11+
- **Docker + Docker Compose**
- **VS Code** + 扩展：ESLint、Prettier、Python、Tailwind CSS IntelliSense

### 17.2 本地启动命令

```bash
# 启动数据库和 Redis
docker-compose up -d

# 启动后端
cd apps/api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# 启动前端
cd apps/web
npm install
npm run dev

# 启动浏览器插件
cd extension
npm install
npm run dev
```

### 17.3 术语表

| 术语 | 解释 |
|------|------|
| SSR | Server-Side Rendering，服务端渲染 |
| JWT | JSON Web Token |
| RPA | Robotic Process Automation，机器人流程自动化 |
| CDN | Content Delivery Network |
| JSONB | PostgreSQL 的二进制 JSON 存储类型 |

---

> 本文档为小红书运营助手的技术方案设计，涵盖 PRD 中全部 P0/P1/P2 功能，后续将随产品迭代持续更新。
