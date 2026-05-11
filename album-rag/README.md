# Album RAG

`album-rag` 是相册项目里的内部向量检索服务。它接收主后端传入的图片描述或搜索文本，完成文本向量化、Qdrant 写入、Qdrant 检索和索引删除。

## 职责

- 接收主后端传来的图片描述、图片 ID 和用户 ID
- 使用 `sentence-transformers` 做文本向量化
- 把向量写入本地 Qdrant
- 按 `user_id` 过滤并搜索向量
- 删除指定用户下指定图片的向量索引

LLM 图片描述和 AI 对话生成由 `album-backend` 负责，`album-rag` 不持有生产 LLM API Key。

## 目录

```text
album-rag/
├── src/rag/           核心服务代码
├── Dockerfile
├── pyproject.toml
└── .env.example
```

## 配置文件

`album-rag/.env.example` 仅说明本服务支持的环境变量。Docker Compose 运行时由 `docker-compose.yml` 显式注入生产所需配置，并从 `album-backend/.env` 读取 `INTERNAL_SERVICE_TOKEN`。

### 主要配置项

- `INTERNAL_SERVICE_TOKEN`: 内部服务鉴权 token
- `EMBEDDING_MODEL`: 向量模型路径或模型名
- `EMBEDDING_DEVICE`: `auto`、`cpu`、`cuda`、`mps`
- `QDRANT_PATH`: 本地 Qdrant 数据目录
- `COLLECTION_NAME`: 向量集合名

### 容器内固定值

在 Docker Compose 中，以下值会固定覆盖为容器内地址：

- `QDRANT_PATH=/data/qdrant`
- `COLLECTION_NAME=photo_rag`
- `EMBEDDING_MODEL=/app/models/bge-small-zh-v1.5`

`EMBEDDING_DEVICE=auto` 时会优先尝试 GPU，可用性不足时自动回退到 CPU；如需强制 CPU，可显式设置为 `cpu`。

## Docker 运行

```bash
docker compose build rag
docker compose up -d rag
```

## 与主项目的关系

- 主后端通过 HTTP 调用本服务
- 持久化数据位于 `data/rag/`
- 服务入口是 `rag.main:app`
