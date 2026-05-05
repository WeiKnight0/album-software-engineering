# Album RAG

`album-rag` 是相册项目里的图片检索服务。它负责把图片描述转成向量，写入本地 Qdrant，并提供搜索和聊天接口给主后端调用。

## 职责

- 接收主后端传来的图片路径和用户信息
- 生成图片描述
- 使用 `sentence-transformers` 做文本向量化
- 把向量写入本地 Qdrant
- 提供搜索、聊天、索引接口

## 目录

```text
album-rag/
├── src/rag/           核心服务代码
├── dev/               调试脚本和测试前端
├── Dockerfile
├── pyproject.toml
├── uv.lock
└── .env.example
```

## 配置文件

`album-rag/.env` 是 `rag` 服务的配置文件。

首次可基于模板创建：

```bash
cp .env.example .env
```

`.env.example` 用来说明 `album-rag` 需要哪些配置项。

### 主要配置项

- `APP_ENV`: 运行环境标记
- `ARTIFACTS_DIR`: 调试脚本输出目录
- `OPENAI_API_KEY`: 图片描述使用的 API Key
- `OPENAI_BASE_URL`: 兼容 OpenAI 的接口地址
- `OPENAI_MODEL`: 图片描述使用的模型名
- `OPENAI_MAX_TOKENS`: 图片描述最大输出 token
- `EMBEDDING_MODEL`: 向量模型路径或模型名
- `EMBEDDING_DEVICE`: `auto`、`cpu`、`cuda`、`mps`
- `QDRANT_PATH`: 本地 Qdrant 数据目录
- `COLLECTION_NAME`: 向量集合名
- `IMAGE_DIR`: 图片导入目录
- `BATCH_SIZE`: 导入批次大小
- `SKIP_EXISTING`: 是否跳过已导入图片
- `DEFAULT_USER_ID`: 调试导入时写入的默认用户 ID

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
- 正式入口不是 CLI，而是 `rag.main:app`
