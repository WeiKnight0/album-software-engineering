# Album RJGC

一个由前端、业务后端、人脸识别服务和 RAG 检索服务组成的相册系统。使用 `docker compose` 启动整套环境。

## 配置文件

- `album-backend/.env`: 主后端配置
- `album-rag/.env`: RAG 服务配置

首次启动前，基于模板创建：

```bash
cp album-backend/.env.example album-backend/.env
cp album-rag/.env.example album-rag/.env
```

`.env.example` 用来说明各服务需要哪些配置项。

## 项目结构

- `album-frontend/`: React + Vite 前端
- `album-backend/`: Spring Boot 主后端
- `face-recognition/`: FastAPI + InsightFace 推理服务
- `album-rag/`: FastAPI RAG 服务
- `data/`: Compose 运行期数据目录

## 启动前准备

- Docker
- Docker Compose
- 可用的 `80`、`8082`、`8001`、`8003` 端口
- 如需 RAG 聊天，需要配置兼容 OpenAI 的 API Key

## 启动方式

构建镜像：

```bash
docker compose build
```

后台启动：

```bash
docker compose up -d
```

查看状态：

```bash
docker compose ps
```

前端地址：

```text
http://localhost
```

默认测试账号：

```text
username: testuser
password: test123
```

## 运行数据

```text
data/backend/photo.db        后端 SQLite 数据库
data/backend/uploads/        原图和缩略图
data/backend/covers/         人脸封面裁剪图
data/rag/qdrant/             RAG 向量库
```

## 常用命令

查看日志：

```bash
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f face-recognition
docker compose logs -f rag
```

重建单个服务：

```bash
docker compose build backend
docker compose up -d backend
```

停止服务：

```bash
docker compose down
```

## 相关文档

- `album-frontend/README.md`
- `album-backend/README.md`
- `face-recognition/README.md`
- `album-rag/README.md`
