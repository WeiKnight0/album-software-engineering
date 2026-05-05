# Face Recognition

`face-recognition` 是主项目的人脸推理服务，基于 FastAPI 和 InsightFace。它只做检测和 embedding 推理，不负责正式业务数据落库。

## 职责

- 接收图片
- 检测人脸
- 返回 `bbox` 和 `embedding`
- 过滤过小的人脸

正式的人脸分类、封面生成和数据库写入发生在 `album-backend`。

## 目录

```text
face-recognition/
├── main.py              FastAPI 推理服务入口
├── docker-entrypoint.sh 模型准备脚本
├── buffalo_l.zip        可选，本地模型压缩包
├── backend_app.py       本地伪后端测试入口
├── backend/             本地模拟持久化逻辑
├── pyproject.toml
├── requirements.txt
└── Dockerfile
```

## HTTP 接口

```text
POST /api/v1/infer
GET  /api/v1/health
```

框格式：

```json
{"x": 0, "y": 0, "w": 100, "h": 120}
```

## Docker 运行

```bash
docker compose build face-recognition
docker compose up -d face-recognition
```

## 模型加载

镜像构建时会优先使用仓库内的 `buffalo_l.zip`。

如果仓库内没有该文件，则 Dockerfile 会在构建阶段下载 `buffalo_l.zip`；下载失败时镜像构建直接失败。

模型只保留在容器内，不映射宿主机目录。

## 测试脚本

`backend_app.py` 和 `backend/` 只用于离线联调和冒烟测试。
