# Album

一个由前端、业务后端、人脸识别服务和 RAG 检索服务组成的相册系统。使用 `docker compose` 启动整套环境。

## 配置文件

- `.env`: Compose 级配置，主要用于 MySQL 数据库账号、初始用户账号
- `album-backend/.env`: 主后端配置
- `album-rag/.env`: RAG 服务配置

首次启动前，基于模板创建：

```bash
cp .env.example .env
cp album-backend/.env.example album-backend/.env
cp album-rag/.env.example album-rag/.env
```

`.env.example` 用来说明各服务需要哪些配置项。

根目录 `.env` 至少需要配置：

```env
MYSQL_DATABASE=album
MYSQL_USER=album_app
MYSQL_PASSWORD=change_me_to_a_strong_password
MYSQL_ROOT_PASSWORD=change_me_to_another_strong_password

INIT_ADMIN_USERNAME=superadmin
INIT_ADMIN_PASSWORD=change_me_to_a_strong_admin_password
INIT_ADMIN_EMAIL=superadmin@example.com
INIT_ADMIN_NICKNAME=Super Admin

INIT_USER_USERNAME=normaluser
INIT_USER_PASSWORD=change_me_to_a_strong_user_password
INIT_USER_EMAIL=user@example.com
INIT_USER_NICKNAME=Normal User
```

`MYSQL_PASSWORD` 是后端连接 MySQL 的数据库用户密码；`MYSQL_ROOT_PASSWORD` 是 MySQL root 用户密码。MySQL 不暴露宿主机端口，后端通过 Docker 内部网络连接 `mysql:3306`。

## 项目结构

- `album-frontend/`: React + Vite 前端
- `album-backend/`: Spring Boot 主后端
- `face-recognition/`: FastAPI + InsightFace 推理服务
- `album-rag/`: FastAPI RAG 服务
- `data/`: Compose 运行期数据目录

## 启动前准备

- Docker
- Docker Compose
- 可用的 `80` 端口
- 如需 RAG 聊天，需要配置兼容 OpenAI 的 API Key

## 启动方式一：全新启动（没有初始化数据库）

适用于第一次部署 MySQL 空库。

1. 创建配置文件：

```bash
cp .env.example .env
cp album-backend/.env.example album-backend/.env
cp album-rag/.env.example album-rag/.env
```

2. 修改 `.env`、`album-backend/.env`、`album-rag/.env` 中的密码、密钥和 API Key。

3. 启动 MySQL、后端、前端、识别服务和 RAG 服务：

```bash
docker compose up -d --build
```

首次启动时，后端会通过 JPA 在 MySQL 中创建表结构。

4. 初始化角色、权限和初始用户：

```bash
docker compose --profile init up init-users
```

初始化脚本不会启动后端应用，而是使用临时 Python 容器执行 `scripts/init-mysql.py`。脚本会把 `.env` 中的 `INIT_ADMIN_PASSWORD` 和 `INIT_USER_PASSWORD` 转成 bcrypt hash 后写入数据库，数据库不会保存明文密码。

5. 访问前端：

```text
http://localhost
```

## 启动方式二：已经初始化过，再次启动

如果 MySQL 数据目录 `data/mysql` 已存在，并且已经执行过初始化用户，日常启动只需要：

```bash
docker compose up -d
```

如果修改过代码或 Dockerfile，需要重新构建：

```bash
docker compose up -d --build
```

不要重复执行初始化命令也可以；如果重复执行，脚本是幂等的，已有用户不会被重新创建，已有用户密码也不会被覆盖。

查看运行状态：

```bash
docker compose ps
```

## 启动方式三：从 SQLite 数据库迁移到 MySQL

适用于已有旧的 `data/backend/photo.db`，需要迁移到 MySQL。

1. 备份 SQLite 数据库：

```bash
cp data/backend/photo.db data/backend/photo.db.bak
```

2. 启动 MySQL 和后端，让后端先在 MySQL 中创建表结构：

```bash
docker compose up -d --build
```

3. 确认后端启动成功后，停止后端和前端，保留 MySQL 运行：

```bash
docker compose stop backend frontend
```

4. 执行 SQLite 到 MySQL 的迁移脚本：

```bash
docker run --rm \
  --network album-rjgc_default \
  --env-file .env \
  -v "$PWD:/workspace" \
  -w /workspace \
  python:3.12-slim \
  sh -c 'pip install pymysql && python scripts/migrate-sqlite-to-mysql.py \
    --sqlite data/backend/photo.db \
    --host mysql \
    --database "$MYSQL_DATABASE" \
    --user "$MYSQL_USER" \
    --password "$MYSQL_PASSWORD" \
    --truncate'
```

MySQL 没有暴露宿主机端口，所以迁移脚本推荐在临时 Python 容器里运行，并通过 Docker 内部网络访问 `mysql:3306`。

如果你的 Compose 项目名不是 `album-rjgc`，网络名可能不是 `album-rjgc_default`，可用下面命令查看：

```bash
docker network ls
```

5. 迁移完成后重新启动：

```bash
docker compose up -d --build
```

迁移脚本会跳过 `refresh_token`，迁移后用户需要重新登录。上传文件、头像、人脸封面、RAG 向量数据不在关系数据库里，需要保留或迁移 `data/` 目录。

## 旧版启动命令

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

## 运行数据

```text
data/mysql/                  MySQL 数据
data/backend/photo.db        旧版 SQLite 数据库（仅迁移前/本地 SQLite 使用）
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
- `docs/mysql-migration.md`
