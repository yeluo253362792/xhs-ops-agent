#!/bin/bash
# 确保 PostgreSQL 数据库存在
# 用于处理已有数据卷但缺少数据库的情况

set -e

echo "检查 PostgreSQL 数据库..."

# 等待 PostgreSQL 启动
for i in {1..30}; do
    if docker exec xhs-postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "PostgreSQL 已就绪"
        break
    fi
    echo "等待 PostgreSQL 启动... ($i/30)"
    sleep 1
done

# 检查数据库是否存在，不存在则创建
if docker exec xhs-postgres psql -U postgres -lqt | cut -d \| -f 1 | grep -qw xhs_ops_agent; then
    echo "数据库 xhs_ops_agent 已存在"
else
    echo "创建数据库 xhs_ops_agent..."
    docker exec xhs-postgres createdb -U postgres xhs_ops_agent
    echo "数据库创建成功"
fi
