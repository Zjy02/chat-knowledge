SHELL := /bin/bash

.PHONY: help install seed api web test test-backend test-frontend test-e2e lint format check build up down logs

help:
	@echo "install      安装前后端依赖与 Git hooks"
	@echo "seed         重置并写入演示账号/知识库"
	@echo "api          启动 FastAPI (http://127.0.0.1:8000)"
	@echo "web          启动 Vite (http://127.0.0.1:5173)"
	@echo "test         后端 + 前端单元测试"
	@echo "test-e2e     Playwright 主链路回归"
	@echo "check        lint + typecheck + tests + build"
	@echo "up           Docker Compose 一键启动"
	@echo "down         停止 Docker Compose"

install:
	cd backend && python3 -m venv .venv && .venv/bin/pip install -e '.[dev]'
	cd frontend && npm ci
	npm install

seed:
	cd backend && .venv/bin/python -m app.scripts.seed --reset

api:
	cd backend && .venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

web:
	cd frontend && npm run dev -- --port 5173

test: test-backend test-frontend

test-backend:
	cd backend && .venv/bin/pytest

test-frontend:
	cd frontend && npm run test:run

test-e2e:
	cd frontend && npm run e2e

lint:
	cd backend && .venv/bin/ruff check app tests
	cd frontend && npm run lint
	npm run format:check

format:
	cd frontend && npm run format
	npx prettier --write '*.{json,md,yml,yaml}'

check: lint
	cd frontend && npm run typecheck && npm run test:run && npm run build
	cd backend && .venv/bin/pytest

build:
	cd frontend && npm run build

up:
	test -f .env || cp .env.example .env
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=200
