# Album Frontend

`album-frontend` 是相册项目的 Web 前端，基于 React + Vite，生产构建后由 Nginx 提供静态资源，并把 `/api` 代理到主后端。

## 主要页面能力

- 登录与用户面板
- 图片列表、预览、下载、回收站
- 文件夹管理
- 人脸分类管理
- 智能搜索和 AI 聊天

## 目录

```text
album-frontend/
├── src/
│   ├── components/
│   ├── services/
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
├── nginx.conf
└── Dockerfile
```

## Docker 运行

```bash
docker compose build frontend
docker compose up -d frontend
```

## 接口约定

- 所有业务请求默认走 `/api`
- 人脸封面通过 `/api/face/{faceId}/cover?userId=...` 获取
- 图片缩略图和下载均由主后端返回
