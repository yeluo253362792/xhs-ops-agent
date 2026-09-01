-- 初始化脚本：确保数据库存在
-- 只在 PostgreSQL 容器首次初始化时执行

CREATE DATABASE xhs_ops_agent;
GRANT ALL PRIVILEGES ON DATABASE xhs_ops_agent TO postgres;
