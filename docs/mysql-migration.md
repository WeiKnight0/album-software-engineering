# MySQL 迁移说明

后端现在可以通过 datasource 环境变量在 SQLite 和 MySQL 之间切换。非 Docker 本地运行默认仍使用 SQLite；Docker Compose 默认使用 MySQL。

## 全新使用 MySQL 启动

1. 在项目根目录创建 `.env` 文件。这个文件和 `docker-compose.yml` 同级，不是 `album-backend/.env`：

```env
MYSQL_DATABASE=album
MYSQL_USER=album_app
MYSQL_PASSWORD=change_me_to_a_strong_password
MYSQL_ROOT_PASSWORD=change_me_to_another_strong_password
```

`docker-compose.yml` 不会把 MySQL 端口暴露到宿主机。后端通过 Docker 内部网络连接 `mysql:3306`。

2. 启动服务：

```bash
docker compose up --build
```

3. 如需初始化默认用户：

```bash
docker compose --profile init up init-users
```

## 从 SQLite 迁移数据到 MySQL

迁移前应停止后端写入，避免 SQLite 源数据在迁移过程中变化。

1. 备份 SQLite 数据库：

```bash
cp data/backend/photo.db data/backend/photo.db.bak
```

2. 启动 MySQL 和后端一次，让 Hibernate 在 MySQL 中创建目标表：

```bash
docker compose up -d --build
```

确认后端启动成功后，停止后端和前端，保留 MySQL 运行：

```bash
docker compose stop backend frontend
```

3. 运行迁移脚本。

由于 MySQL 端口没有暴露到宿主机，推荐使用临时 Python 容器执行迁移脚本。这个容器会加入同一个 Docker 网络，通过 `mysql:3306` 访问 MySQL：

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

4. 迁移完成后重新启动服务：

```bash
docker compose up -d --build
```

迁移脚本会保留主键值，并跳过 `refresh_token` 表。因此迁移后用户需要重新登录。

## 是否必须在容器里运行迁移脚本

不是必须，但当前推荐在临时容器里运行。

原因是 MySQL 没有暴露宿主机端口，宿主机上的 `python3 scripts/migrate-sqlite-to-mysql.py --host 127.0.0.1` 默认连不上 MySQL。

如果你临时开放 MySQL 端口，也可以在宿主机直接运行：

```bash
python3 -m pip install pymysql

python3 scripts/migrate-sqlite-to-mysql.py \
  --sqlite data/backend/photo.db \
  --host 127.0.0.1 \
  --database album \
  --user album_app \
  --password change_me_to_a_strong_password \
  --truncate
```

但不建议长期暴露 MySQL 端口。迁移完成后应移除端口映射。

## 注意事项

- 上传文件、头像、人脸封面、RAG 向量数据不在关系数据库里，仍然需要保留或迁移 `data/` 目录。
- 第一次迁移可以继续使用 `spring.jpa.hibernate.ddl-auto=update` 创建表结构。生产环境长期使用建议改为 schema migration，并使用 `validate`。
- 如果后续改了表名，需要同步更新迁移脚本中的表顺序和映射。
- `refresh_token` 不迁移是有意设计，迁移后让用户重新登录更安全。
