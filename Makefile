.PHONY: help install backend frontend test up down

help:
	@echo "小红书运营助手 - 本地开发命令"
	@echo "  make up        - 启动 Docker 服务（PostgreSQL + Redis + API）"
	@echo "  make down      - 停止 Docker 服务"
	@echo "  make backend   - 安装后端依赖"
	@echo "  make frontend  - 安装前端依赖"
	@echo "  make test      - 运行后端测试"
	@echo "  make dev-api   - 本地启动后端开发服务器"
	@echo "  make dev-web   - 本地启动前端开发服务器"

up:
	docker-compose up -d

down:
	docker-compose down

backend:
	cd apps/api && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt

frontend:
	cd apps/web && npm install

test:
	cd apps/api && source venv/bin/activate && pytest

dev-api:
	cd apps/api && source venv/bin/activate && uvicorn app.main:app --reload

dev-web:
	cd apps/web && npm run dev
