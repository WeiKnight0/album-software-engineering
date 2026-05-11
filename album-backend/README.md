# Album Backend

`album-backend` 是主业务后端，基于 Spring Boot + JPA，负责用户、图片、文件夹、回收站、人脸相册和 RAG 集成。Docker Compose 默认连接 MySQL，非 Docker 本地运行默认仍可使用 SQLite。

## 主要能力

- 用户注册、登录和会员状态
- 图片上传、下载、缩略图和回收站
- 文件夹管理
- 上传后自动触发人脸识别和 RAG 入库
- 人脸分类列表、重命名、合并、删除、按人搜索

## 目录

```text
album-backend/
├── src/main/java/com/photo/backend/
│   ├── asset/           图片、文件夹、下载上传
│   ├── face/            人脸控制器和持久化
│   ├── rag/             RAG 调用、状态编排与性能日志
│   ├── user/            用户和认证
│   └── common/          实体和仓储
├── src/main/resources/application.properties
├── .env.example
├── pom.xml
└── Dockerfile
```

## 配置文件

`album-backend/.env` 是 `backend` 服务的配置文件。

首次可基于模板创建：

```bash
cp .env.example .env
```

`.env.example` 用来说明 `album-backend` 需要哪些配置项。

### 主要配置项

- `SPRING_DATASOURCE_URL`: 数据库连接 URL
- `SPRING_DATASOURCE_USERNAME`: 数据库用户名
- `SPRING_DATASOURCE_PASSWORD`: 数据库密码
- `SPRING_DATASOURCE_DRIVER_CLASS_NAME`: JDBC Driver 类名
- `UPLOAD_BASE_PATH`: 原图存储根目录
- `UPLOAD_TEMP_PATH`: 上传临时目录
- `FACE_MODEL_ENABLED`: 是否启用人脸识别集成
- `FACE_MODEL_BASE_URL`: 人脸识别服务地址
- `FACE_MODEL_INFER_PATH`: 人脸识别推理接口路径
- `FACE_MODEL_TIMEOUT_MS`: 人脸识别请求超时
- `FACE_MODEL_COVERS_DIR`: 人脸封面图目录
- `RAG_BASE_URL`: RAG 服务地址
- `RAG_LLM_ENABLED`: 是否启用后端侧 RAG 问答
- `RAG_LLM_API_KEY`: 后端调用 LLM 使用的 API Key
- `RAG_LLM_BASE_URL`: 兼容 OpenAI 的接口地址
- `RAG_LLM_MODEL`: 后端问答使用的模型名
- `RAG_LLM_TIMEOUT_MS`: 后端调用 LLM 的超时设置

### 容器内固定值

在 Docker Compose 中，以下值会固定覆盖为容器内地址：

- `SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/${MYSQL_DATABASE}...`
- `SPRING_DATASOURCE_USERNAME=${MYSQL_USER}`
- `SPRING_DATASOURCE_PASSWORD=${MYSQL_PASSWORD}`
- `SPRING_DATASOURCE_DRIVER_CLASS_NAME=com.mysql.cj.jdbc.Driver`
- `UPLOAD_BASE_PATH=/data/uploads`
- `UPLOAD_TEMP_PATH=/data/uploads/temp`
- `FACE_MODEL_BASE_URL=http://face-recognition:8001`
- `FACE_MODEL_COVERS_DIR=/data/covers`
- `RAG_BASE_URL=http://rag:8003`

## Docker 运行

```bash
docker compose build backend
docker compose up -d backend
```

## 初始数据初始化

后端不再负责初始化默认用户、角色和权限。Docker 环境下，先启动服务让后端创建表结构：

```bash
docker compose up -d --build
```

然后在项目根目录 `.env` 中配置初始账号：

```env
INIT_ADMIN_USERNAME=superadmin
INIT_ADMIN_PASSWORD=change_me_to_a_strong_admin_password
INIT_ADMIN_EMAIL=superadmin@example.com
INIT_ADMIN_NICKNAME=Super Admin

INIT_USER_USERNAME=normaluser
INIT_USER_PASSWORD=change_me_to_a_strong_user_password
INIT_USER_EMAIL=user@example.com
INIT_USER_NICKNAME=Normal User
```

执行初始化：

```bash
docker compose --profile init up init-users
```

初始化由临时 Python 容器执行 `scripts/init-mysql.py`，不是由后端应用执行。脚本会把明文初始密码转换成 bcrypt hash 后写入数据库；已有用户不会被覆盖密码。
