# 真实用户认证系统技术方案

> 适用项目：小红书运营助手（xhs-ops-agent）  
> 版本：v1.0  
> 日期：2026-09-01

---

## 1. 背景与目标

### 1.1 现状
当前系统使用 MVP 阶段的固定测试用户（`550e8400-e29b-41d4-a716-446655440000`），所有登录用户共享同一身份，历史记录、配额、订阅等级无法按真实用户隔离。

### 1.2 目标
- 支持真实用户注册、登录、登出
- 支持多种认证方式：手机号 + 验证码、邮箱 + 验证码、邮箱 + 密码
- 为后续「每日生成配额」「会员订阅」「历史记录隔离」奠定基础
- 满足中国大陆个人信息保护法（PIPL）及平台运营合规要求

---

## 2. 认证方式选型

| 方式 | 用户体验 | 实现成本 | 合规成本 | 推荐阶段 |
|------|---------|---------|---------|---------|
| 手机号 + 验证码 | ⭐⭐⭐ | 中 | 高（需企业实名、短信签名模板报备） | 正式运营 |
| 邮箱 + 验证码 | ⭐⭐ | 低 | 低 | MVP 验证 |
| 邮箱 + 密码 | ⭐⭐ | 低 | 低 | 早期内测 |
| 微信扫码登录 | ⭐⭐⭐ | 中 | 中（需企业资质） | 增长期 |

**本方案优先实现「邮箱 + 验证码」和「手机号 + 验证码」**，保留密码登录扩展接口但不作为默认方式。

---

## 3. 总体架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   前端 (Next.js) │────▶│  FastAPI 后端   │────▶│   PostgreSQL    │
│                 │     │                 │     │   users /       │
│  登录/注册页面   │     │  认证路由 / 服务 │     │   verification  │
│  Token 管理     │     │  JWT 签发/校验   │     │   refresh_tokens│
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌─────────┐  ┌─────────┐  ┌─────────────┐
              │  Redis  │  │ 短信服务商│  │  邮件服务商  │
              │ 验证码   │  │ 阿里云  │  │ SendGrid/   │
              │ Token黑名单│  │ 腾讯云  │  │ 阿里云邮件   │
              └─────────┘  └─────────┘  └─────────────┘
```

---

## 4. 数据库设计

### 4.1 users 表（改造）

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255),
    nickname VARCHAR(100),
    avatar_url VARCHAR(500),
    
    -- 认证状态
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    auth_method VARCHAR(20) NOT NULL DEFAULT 'email_code', -- email_code / phone_code / password / wechat
    
    -- 订阅与配额
    subscription_tier VARCHAR(20) DEFAULT 'free',
    daily_quota INTEGER DEFAULT 3,
    daily_used INTEGER DEFAULT 0,
    
    -- 账号状态
    status VARCHAR(20) DEFAULT 'active', -- active / suspended / deleted
    
    -- 安全
    failed_login_count INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);
```

### 4.2 verification_codes 表

```sql
CREATE TABLE verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target VARCHAR(255) NOT NULL,        -- 邮箱或手机号
    code VARCHAR(10) NOT NULL,
    type VARCHAR(20) NOT NULL,           -- register / login / reset_password / bind
    used BOOLEAN DEFAULT FALSE,
    verified BOOLEAN DEFAULT FALSE,
    expired_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_verification_codes_target ON verification_codes(target, type, created_at DESC);
```

### 4.3 refresh_tokens 表

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,    -- SHA-256 哈希后的 token
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
```

### 4.4 login_logs 表

```sql
CREATE TABLE login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    target VARCHAR(255),                 -- 登录目标（邮箱/手机号）
    auth_method VARCHAR(20),
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    fail_reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_login_logs_user ON login_logs(user_id, created_at DESC);
CREATE INDEX idx_login_logs_ip ON login_logs(ip_address, created_at DESC);
```

---

## 5. API 设计

### 5.1 发送验证码

```http
POST /auth/send-code
Content-Type: application/json

{
  "target": "13800138000",
  "type": "register",        // register | login | reset_password | bind
  "captcha_token": "xxx"     // 图形验证码凭证（高频场景）
}
```

**响应：**
```json
{
  "success": true,
  "message": "验证码已发送",
  "retry_after": 60
}
```

**限流策略：**
- 同一 target 60 秒内只能发 1 次
- 同一 target 每天最多 10 次
- 同一 IP 每天最多 50 次

### 5.2 手机号注册

```http
POST /auth/register-by-phone
Content-Type: application/json

{
  "phone": "13800138000",
  "code": "123456",
  "nickname": "小红书玩家"
}
```

### 5.3 邮箱注册

```http
POST /auth/register-by-email
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456",
  "nickname": "小红书玩家"
}
```

### 5.4 手机号/邮箱登录

```http
POST /auth/login-by-phone
POST /auth/login-by-email
Content-Type: application/json

{
  "phone": "13800138000",
  "code": "123456"
}
```

**统一响应：**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900,
  "refresh_token": "uuid-string",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "nickname": "小红书玩家",
    "subscription_tier": "free"
  }
}
```

### 5.5 刷新 Access Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "uuid-string"
}
```

### 5.6 登出

```http
POST /auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refresh_token": "uuid-string"   // 可选：同时吊销 refresh token
}
```

### 5.7 获取当前用户

```http
GET /auth/me
Authorization: Bearer <access_token>
```

---

## 6. 验证码服务设计

### 6.1 验证码生成
- 6 位数字
- 有效期 5 分钟
- 同一类型同一 target 同时只保留一条有效记录

### 6.2 存储策略
优先使用 Redis：

```
key:   auth:code:{type}:{target}
value: 123456
TTL:   300s
```

降级方案：若 Redis 不可用，写入 `verification_codes` 表。

### 6.3 发送流程
```
1. 校验图形验证码（如启用）
2. 校验限流（target/IP）
3. 生成验证码
4. 写入 Redis（5 分钟 TTL）
5. 调用短信/邮件服务商发送
6. 记录发送日志（审计）
```

### 6.4 校验流程
```
1. 从 Redis 读取验证码
2. 比对并标记为已使用（防止重放）
3. 删除 Redis 键
4. 写入 verification_codes 表 verified=true
```

---

## 7. JWT Token 策略

### 7.1 Access Token
- 存储：前端内存 / 短期 cookie
- 算法：HS256
- 有效期：15 分钟
- Payload：
  ```json
  {
    "sub": "user_id",
    "email": "user@example.com",
    "tier": "free",
    "iat": 1234567890,
    "exp": 1234568790
  }
  ```

### 7.2 Refresh Token
- 存储：后端数据库 + 前端 httpOnly cookie / secure storage
- 格式：UUID v4（32 字节随机字符串）
- 有效期：7 天
- 数据库中存储 SHA-256 哈希，原始 token 只返回一次
- 登出时标记 `revoked_at`

### 7.3 Token 刷新机制
```
前端请求 API
    │
    ▼
Access Token 有效？ ──是──▶ 正常响应
    │
    否
    ▼
使用 Refresh Token 请求 /auth/refresh
    │
    ▼
返回新 Access Token + 可选新 Refresh Token
```

---

## 8. 安全与风控

### 8.1 密码策略（如启用密码登录）
- 最小长度 8 位
- 必须包含字母 + 数字
- 禁止使用常见弱密码
- bcrypt 慢哈希（cost factor 12）

### 8.2 账号锁定
- 连续 5 次登录失败锁定 30 分钟
- 验证码连续 5 次错误锁定 1 小时

### 8.3 限流
使用 `slowapi` 或自定义 Redis 限流中间件：

| 接口 | 限流策略 |
|------|---------|
| /auth/send-code | 60s/次 per target；10/天 per target；50/天 per IP |
| /auth/login-* | 5/分钟 per target；20/小时 per IP |
| /auth/register-* | 3/小时 per IP |

### 8.4 图形验证码
在以下场景强制要求：
- 同一 IP 连续发送 3 次验证码
- 登录失败 3 次以上
- 注册频率异常

### 8.5 敏感信息保护
- HTTPS 全站
- Cookie 设置 `HttpOnly`、`Secure`、`SameSite=Lax`
- 日志中脱敏手机号/邮箱
- 不返回 password_hash 给前端

---

## 9. 第三方服务配置

### 9.1 阿里云短信
```env
SMS_PROVIDER=aliyun
SMS_ACCESS_KEY_ID=xxx
SMS_ACCESS_KEY_SECRET=xxx
SMS_SIGN_NAME=小红书运营助手
SMS_TEMPLATE_CODE_REGISTER=SMS_xxx
SMS_TEMPLATE_CODE_LOGIN=SMS_xxx
```

### 9.2 SendGrid 邮件
```env
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=SG.xxx
EMAIL_FROM=noreply@xhs-ops-agent.com
EMAIL_FROM_NAME=小红书运营助手
```

### 9.3 Redis
已存在，复用：
```env
REDIS_URL=redis://localhost:6379/0
```

---

## 10. 前端改造

### 10.1 新增页面/组件
- `/login` 登录页
- `/register` 注册页
- `AuthModal` 登录弹窗
- `CodeInput` 验证码输入组件（带倒计时）
- `CaptchaModal` 图形验证码弹窗

### 10.2 状态管理
- 使用 React Context / Zustand 管理登录态
- Access Token 存在内存中
- Refresh Token 由 httpOnly cookie 管理（推荐）或 secure storage

### 10.3 API 调用
封装 `api.ts`：
- 自动携带 access token
- 401 时自动调用 `/auth/refresh`
- 刷新失败则跳转登录

---

## 11. 实现计划（Roadmap）

### 阶段 1：基础认证（2-3 天）
- [ ] 改造 `users` 表
- [ ] 新增 `verification_codes` 表
- [ ] 实现邮箱 + 验证码注册/登录
- [ ] 前端登录/注册页面
- [ ] 更新 `/auth/me` 和 token 管理

### 阶段 2：安全加固（2 天）
- [ ] Redis 验证码存储
- [ ] 限流中间件
- [ ] 图形验证码
- [ ] 登录日志

### 阶段 3：手机号认证（3-5 天）
- [ ] 接入阿里云/腾讯云短信
- [ ] 短信签名/模板报备
- [ ] 手机号 + 验证码注册/登录

### 阶段 4：Token 与风控（2 天）
- [ ] Refresh Token 机制
- [ ] Token 黑名单
- [ ] 账号锁定
- [ ] 登出功能

### 阶段 5：合规（1-2 天）
- [ ] 隐私政策页面
- [ ] 用户协议页面
- [ ] 账号注销/数据删除接口

---

## 12. 风险与合规

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 短信被恶意刷取 | 高额账单 | 限流 + 图形验证码 + IP 风控 |
| 验证码被暴力破解 | 账号被盗 | 6 位验证码 + 5 次错误锁定 |
| Token 泄露 | 用户数据泄露 | 短有效期 access token + refresh token |
| PIPL 合规风险 | 行政处罚 | 隐私政策 + 用户授权 + 数据删除能力 |
| 短信到达率低 | 用户流失 | 备用短信服务商 + 邮件兜底 |

---

## 13. 附录：环境变量示例

```env
# JWT
SECRET_KEY=your-256-bit-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# 认证开关
AUTH_REGISTER_ENABLED=true
AUTH_PASSWORD_ENABLED=false
AUTH_PHONE_ENABLED=false
AUTH_EMAIL_ENABLED=true

# Redis（复用已有）
REDIS_URL=redis://localhost:6379/0

# 短信（阿里云）
SMS_PROVIDER=aliyun
SMS_ACCESS_KEY_ID=
SMS_ACCESS_KEY_SECRET=
SMS_SIGN_NAME=小红书运营助手
SMS_TEMPLATE_CODE_REGISTER=
SMS_TEMPLATE_CODE_LOGIN=

# 邮件（SendGrid）
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=
EMAIL_FROM=noreply@xhs-ops-agent.com
EMAIL_FROM_NAME=小红书运营助手

# 图形验证码（极验）
GEETEST_CAPTCHA_ID=
GEETEST_CAPTCHA_KEY=
```

---

## 14. 与现有系统的兼容

- 保留当前 `TEST_USER_ID` 作为 fallback，用于自动化测试和无数据库的演示环境
- 新增 `auth_method` 字段，老用户默认为 `email_code`
- 历史记录表 `generation_history.user_id` 外键保持不变，直接指向真实用户 ID
- 通过 Alembic 或手动 SQL 脚本执行数据库迁移
