# Dev Utilities

`dev/` 目录只存放 `album-rag` 的测试脚本、实验前端和调试产物，不属于生产运行面。

## 目录说明

- `scripts/`: 调试脚本
- `static/`: 测试前端页面草稿
- `output/`: 调试脚本生成的文件，如 `viewer.html`、`ingested.json`、`ingest_metrics.json`

`output/` 属于环境相关产物目录，通常不应提交到 Git。

## 常用命令

启动 API 服务：

```bash
uv run uvicorn rag.main:app --host 0.0.0.0 --port 8003
```

查看知识库描述：

```bash
uv run python dev/scripts/view_descriptions.py
```

生成静态查看器：

```bash
uv run python dev/scripts/generate_viewer.py
```
