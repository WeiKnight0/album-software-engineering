# 图像知识库 RAG 使用指南

## 环境配置

### `.env` 配置

```env
APP_ENV=prod
ARTIFACTS_DIR=./dev/output
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen-vl-max
OPENAI_MAX_TOKENS=2048
IMAGE_DIR=./data/images
QDRANT_PATH=./qdrant_data
COLLECTION_NAME=photo_rag
EMBEDDING_MODEL=BAAI/bge-small-zh-v1.5
EMBEDDING_DEVICE=auto
BATCH_SIZE=1
SKIP_EXISTING=true
DEFAULT_USER_ID=0
```

`.env.example` 是模板文件，用来说明 `album-rag` 需要哪些配置项。

字段说明：

- `APP_ENV`: 运行环境标记
- `ARTIFACTS_DIR`: 调试脚本输出目录
- `OPENAI_API_KEY`: 图片描述使用的 API Key
- `OPENAI_BASE_URL`: 兼容 OpenAI 的接口地址
- `OPENAI_MODEL`: 图片描述使用的模型名
- `OPENAI_MAX_TOKENS`: 图片描述最大输出 token
- `IMAGE_DIR`: 导入图片目录
- `QDRANT_PATH`: Qdrant 数据目录
- `COLLECTION_NAME`: 向量集合名
- `EMBEDDING_MODEL`: 向量模型路径或模型名
- `EMBEDDING_DEVICE`: `auto`、`cpu`、`cuda`、`mps`
- `BATCH_SIZE`: 导入批次大小
- `SKIP_EXISTING`: 是否跳过已导入图片
- `DEFAULT_USER_ID`: 调试导入时使用的默认用户 ID

如果通过 Docker Compose 运行，`QDRANT_PATH` 和 `EMBEDDING_MODEL` 会在容器内被覆盖为 `/data/qdrant` 和 `/app/models/bge-small-zh-v1.5`。

## 导入图片

将 `IMAGE_DIR` 指向的图片目录导入知识库：

```powershell
$env:PYTHONIOENCODING="utf-8"
uv run python -m rag.cli ingest
```

导入流程：
1. 逐张调用多模态模型生成详细描述
2. 使用 `BAAI/bge-small-zh-v1.5` 将描述向量化
3. 存入本地 Qdrant 数据库

## 调试工具

`album-rag` 的前端页面和相关脚本都放在 `dev/` 目录。

### 启动 API 服务

```powershell
uv run uvicorn rag.main:app --host 0.0.0.0 --port 8003
```

### 生成静态 HTML 查看器

```powershell
uv run python dev/scripts/generate_viewer.py
```

### CLI 表格查看

```powershell
uv run python dev/scripts/view_descriptions.py
uv run python dev/scripts/view_descriptions.py --name IMG_20260303_105448.jpg
```

## 交互式问答

```powershell
$env:PYTHONIOENCODING="utf-8"
uv run python -m rag.cli chat
```

## CLI 命令参考

```powershell
uv run python -m rag.cli
uv run python -m rag.cli ingest
uv run python -m rag.cli chat
uv run python -m rag.cli search <关键词>
uv run python -m rag.cli status
```

## API 接口参考

```powershell
uv run uvicorn rag.main:app --host 0.0.0.0 --port 8003
```

| 接口 | 方法 | 说明 |
|------|------|------|
| `GET /health` | - | 健康检查 |
| `POST /index` | JSON `{user_id, image_id, description}` | 写入向量 |
| `POST /search` | JSON `{user_id, query, top_k}` | 向量检索 |
| `DELETE /index/{user_id}/{image_id}` | - | 删除向量 |
