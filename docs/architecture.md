# 自然相册 · 架构设计文档

> 面向维护者和核心开发者，解释「为什么这样设计」。
> 最后更新：2026-05-10

---

## 目录

1. [系统架构概览](#1-系统架构概览)
2. [后端模块划分](#2-后端模块划分)
3. [核心数据流](#3-核心数据流)
4. [关键技术决策](#4-关键技术决策)
5. [数据库设计](#5-数据库设计)
6. [接口规范](#6-接口规范)
7. [测试文档](#7-测试文档)

---

## 1. 系统架构概览

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户浏览器                                │
└────────────────────────────┬────────────────────────────────────┘
                             │ :80
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Nginx (album-frontend)                        │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐ │
│  │ 静态资源 SPA  │  │ /api/* → proxy_pass http://backend:8082 │ │
│  └──────────────┘  └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Spring Boot 主后端 (album-backend)                  │
│                      :8082 (仅内部)                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ │
│  │  user   │ │  asset  │ │  face   │ │   rag   │ │   ai     │ │
│  │ 认证/JWT │ │ 图片/文件│ │ 人脸业务│ │ 向量/AI │ │ 会话持久化│ │
│  └─────────┘ └─────────┘ └────┬────┘ └────┬────┘ └──────────┘ │
│                               │           │                    │
│  ┌─────────┐ ┌─────────┐      │           │                    │
│  │  admin  │ │common/  │      │           │                    │
│  │ 管理后台 │ │config/  │      │           │                    │
│  └─────────┘ │bootstrap│      │           │                    │
│              └─────────┘      │           │                    │
└───────────────────────────────┼───────────┼────────────────────┘
                                │           │
                   Bearer Token │           │ Bearer Token
                                ▼           ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  face-recognition        │  │  album-rag               │
│  FastAPI + InsightFace   │  │  FastAPI + Qdrant        │
│  :8001 (仅内部)           │  │  :8003 (仅内部)           │
│                          │  │                          │
│  /api/v1/infer           │  │  /index  /search  /delete│
│  /api/v1/health          │  │  /health                 │
└──────────────────────────┘  └──────────────────────────┘
```

### 1.2 服务职责

| 服务 | 技术栈 | 职责 |
|------|--------|------|
| `album-frontend` | React 18 + Vite + Ant Design + React Router | 用户端 SPA + 管理端 SPA，通过 Nginx 反代 |
| `album-backend` | Spring Boot 3 + SQLite + Spring Security + JPA | 主业务后端：用户、权限、图片、文件夹、人脸业务编排、RAG 编排、AI 会话、管理后台 |
| `face-recognition` | FastAPI + InsightFace (buffalo_l) | 人脸检测 + 512 维 embedding 推理，纯模型服务，无业务逻辑 |
| `album-rag` | FastAPI + SentenceTransformers (bge-small-zh-v1.5) + Qdrant | 文本向量化 + 语义检索 + 向量存储，纯检索服务 |

### 1.3 通信方式

- **前端 → Nginx → 后端**：HTTP REST，JWT Bearer 认证
- **后端 → 人脸服务**：HTTP REST，Bearer Token 内部鉴权
- **后端 → RAG 服务**：HTTP REST，Bearer Token 内部鉴权
- **后端 → LLM API**：HTTP REST（DashScope/OpenAI 兼容），Bearer API Key。生产 Web 链路中的 LLM 调用只发生在 `album-backend`，`album-rag` 不持有生产 LLM API Key。

### 1.4 数据存储

| 存储 | 位置 | 内容 |
|------|------|------|
| SQLite | `data/backend/photo.db` | 所有业务数据（用户、图片元数据、人脸、AI 会话等） |
| 文件系统 | `data/backend/uploads/` | 原图 + 缩略图，按 `user_{id}/images/` 和 `user_{id}/thumbnails/` 分目录 |
| 文件系统 | `data/backend/covers/` | 人脸封面裁剪图 |
| 文件系统 | `data/backend/avatars/` | 用户头像 |
| Qdrant | `data/rag/qdrant/` | 图片描述向量索引 |
| InsightFace | `data/face-recognition/models/` | 预训练模型文件 |

---

## 2. 后端模块划分

后端按业务域划分包，每个包包含 `controller`、`service`、`dto`、`entity`、`repository` 等子包。

```
com.photo.backend
├── user/                    # 用户域
│   ├── controller/
│   │   ├── AuthController         # 登录、注册
│   │   ├── UserController         # 当前用户信息、密码、头像
│   │   └── PaymentController      # 会员支付
│   ├── service/
│   │   ├── UserService            # 用户 CRUD、JWT 生成/解析、头像存储
│   │   ├── RbacService            # 角色/权限判定（SUPER_ADMIN/ADMIN/USER）
│   │   └── CurrentUserService     # 从 SecurityContext 获取当前用户
│   └── dto/
│       └── CurrentUserDTO         # 当前用户响应 DTO
│
├── asset/                   # 资产域
│   ├── controller/
│   │   ├── ImageController        # 图片上传/下载/缩略图/批量操作
│   │   ├── FolderController       # 文件夹 CRUD
│   │   ├── UploadController       # 上传任务管理
│   │   └── DownloadController     # 下载任务管理
│   ├── service/
│   │   ├── ImageService           # 图片存储、缩略图、回收站、人脸识别触发
│   │   ├── FolderService          # 文件夹层级管理
│   │   ├── UploadService          # 上传任务进度跟踪
│   │   └── DownloadService        # 下载任务进度跟踪
│   └── util/
│       ├── ThumbnailUtil          # 缩略图生成（ImageIO）
│       ├── MetadataUtil           # EXIF 提取
│       └── UploadFileUtil         # 临时文件清理
│
├── face/                    # 人脸域
│   ├── controller/
│   │   └── FaceController         # 人脸列表、命名、合并、删除、搜索
│   └── service/
│       ├── FaceService                  # 人脸业务编排（入口）
│       ├── FaceModelClient              # 调用人脸推理服务
│       ├── FaceRecognitionPersistenceService  # 推理结果持久化
│       ├── FaceRemarkService            # 人物命名
│       ├── FaceMergeService             # 人物合并
│       ├── FaceDeleteService            # 人物分类删除
│       └── FaceServiceException         # 人脸业务异常
│
├── rag/                     # RAG 域
│   ├── controller/
│   │   └── RagController          # 智能搜索、AI 对话
│   ├── service/
│   │   ├── RagService             # RAG 编排：检索+人名匹配+LLM
│   │   ├── RagLLMClient           # LLM API 调用（图片分析+对话生成）
│   │   ├── RagVectorClient        # RAG 向量服务调用
│   │   └── ImageAnalysisService   # 向量索引状态管理
│   ├── entity/
│   │   └── RagPerformanceLog      # RAG 性能日志
│   └── repository/
│       └── RagPerformanceLogRepository
│
├── ai/                      # AI 会话域
│   ├── controller/
│   │   └── AiChatController       # 会话 CRUD、发送消息
│   ├── service/
│   │   └── AiChatService          # 会话持久化、上下文管理、调用 RAG
│   ├── entity/
│   │   ├── AiChatSession          # 会话实体
│   │   └── AiChatMessage          # 消息实体
│   └── repository/
│       ├── AiChatSessionRepository
│       └── AiChatMessageRepository
│
├── admin/                   # 管理域
│   ├── controller/
│   │   └── AdminController        # 用户管理、权限分配、日志/任务查看/导出
│   ├── service/
│   │   └── AdminAuditLogService   # 审计日志记录
│   ├── entity/
│   │   └── AdminAuditLog          # 审计日志实体
│   ├── dto/
│   │   └── AdminUserDTO           # 管理端用户 DTO
│   └── repository/
│       └── AdminAuditLogRepository
│
├── common/                  # 共享层
│   ├── entity/              # 15 个 JPA 实体（User、Image、Face 等）
│   ├── repository/          # 15 个 JPA Repository
│   ├── dto/
│   │   └── ApiResponse      # 统一响应包装
│   └── exception/
│       ├── BusinessException     # 业务异常
│       └── GlobalExceptionHandler  # 全局异常处理
│
├── config/                  # 配置层
│   ├── SecurityConfig             # Spring Security 配置（无状态 JWT）
│   ├── JwtAuthenticationFilter    # JWT 解析过滤器（Header + Query Token）
│   └── AsyncConfig                # 异步任务配置
│
├── bootstrap/               # 初始化
│   ├── BootstrapInitializer       # 角色/权限/默认用户初始化（仅 profile=init 时）
│   ├── ApplicationStartupAuditListener  # 启动审计日志
│   └── StartUpRunner
│
└── util/                    # 工具层
    ├── ThumbnailUtil
    ├── MetadataUtil
    └── FileMultipartFile
```

### 2.1 依赖关系

```
admin ──→ user (UserService, RbacService, CurrentUserService)
asset ──→ user (UserService)
asset ──→ face (FaceService, FaceModelClient)
asset ──→ rag  (RagVectorClient, ImageAnalysisService)
face  ──→ common (实体/仓库)
rag   ──→ face (FaceService, 人名搜索)
rag   ──→ asset (ImageService, 图片查询)
ai    ──→ rag  (RagService, 对话生成)
```

> `@Lazy` 注解用于打破 `asset ↔ face` 和 `asset ↔ rag` 之间的循环依赖。

---

## 3. 核心数据流

### 3.1 图片上传流水线

```
用户上传图片
    │
    ▼
ImageController.uploadImage()
    │
    ▼
ImageService.uploadImage()
    ├── 1. 存储限额检查 (UserService.checkStorageLimit)
    ├── 2. 文件类型校验 (Content-Type + 扩展名 + ImageIO.read)
    ├── 3. 保存原图 → uploads/user_{id}/images/{uuid}.{ext}
    ├── 4. 提取 EXIF 元数据 (MetadataUtil)
    ├── 5. 生成缩略图 → uploads/user_{id}/thumbnails/{uuid}_thumb.{ext}
    ├── 6. 写入 Image 表
    │
    ├── [会员] 7. 人脸检测与持久化
    │   ├── FaceModelClient.infer() → 调用 face-recognition 服务
    │   ├── FaceRecognitionPersistenceService.persistInferResult()
    │   │   ├── 比对现有 face embedding（余弦距离 < 0.5 → 匹配）
    │   │   ├── 新 face → 创建 Face 记录 + 裁剪封面
    │   │   └── 写入 FaceAppearance 记录
    │   └── 同步执行，确保事务内完成
    │
    ├── [会员] 8. 向量索引（异步）
    │   ├── ImageAnalysisService.createPendingRecord() → PENDING 状态
    │   ├── TransactionSynchronization.afterCommit() → 事务提交后触发
    │   └── ImageAnalysisService.runVectorIndexAsync()
    │       ├── RagLLMClient.analyzeImage() → LLM 描述图片
    │       └── RagVectorClient.index() → 写入 Qdrant
    │
    └── 9. 更新用户存储用量 (UserService.updateStorageUsed)
```

### 3.2 智能搜索

```
用户输入查询词
    │
    ▼
RagController.searchImages()
    │
    ▼
RagService.search()
    ├── 1. 人名匹配：FaceService.searchImagesByMentionedFaceNames()
    │   ├── 遍历当前用户所有已命名人物
    │   ├── 查询词包含人物名 → 返回该人物关联图片
    │   └── 精确匹配回退：FaceRepository 模糊查询
    │
    ├── 2. 向量检索：RagVectorClient.search()
    │   ├── 文本向量化 (bge-small-zh-v1.5)
    │   ├── Qdrant 相似度搜索（按 user_id 过滤）
    │   └── 按 score 阈值 (0.45) 过滤
    │
    ├── 3. 合并去重（人名结果 + 向量结果）
    │
    └── 4. 从 SQLite 补全 Image 元数据（过滤回收站）
```

### 3.3 AI 对话

```
用户发送消息
    │
    ▼
AiChatController.chat(sessionId)
    │
    ▼
AiChatService.chat()
    ├── 1. 保存 user message → AiChatMessage 表
    ├── 2. 读取最近 10 条历史消息作为上下文
    ├── 3. 调用 RagService.chat(userId, message, history)
    │   ├── 向量检索 + 人名匹配 → 相关图片
    │   ├── RagLLMClient.generateAnswer()
    │   │   ├── system prompt：角色边界 + 输出约束
    │   │   ├── context：图片描述（不含 image_id）
    │   │   └── 用户消息（经过 sanitizeUserText 清洗）
    │   └── 返回 answer + references
    ├── 4. 保存 assistant message + references_json
    └── 5. 返回 [userMessage, assistantMessage]
```

### 3.4 人脸管理

```
人脸命名：FaceController → FaceService.updateFaceName()
人脸合并：FaceController → FaceService.mergeFaces()
    ├── 选择主 face（embedding 加权平均）
    ├── 迁移所有 FaceAppearance 到主 face
    ├── 删除被合并的 face
    └── 重新生成封面
人脸删除：FaceController → FaceService.deleteFaceClassification()
    ├── 删除 FaceAppearance 记录
    ├── 删除封面文件
    └── 删除 Face 记录（不删除原图）
人名搜索：FaceController → FaceService.searchImagesByFaceName()
    ├── 模糊匹配 face_name
    ├── 查找关联 FaceAppearance
    └── 返回可见图片列表
```

---

## 4. 关键技术决策

### 4.1 SQLite 而非 MySQL/PostgreSQL

**决策**：使用 SQLite 作为唯一数据库。

**理由**：
- 单机部署场景，不需要分布式数据库
- 零配置、零运维，数据库文件即备份
- 单用户相册场景并发极低，SQLite 的写锁不会成为瓶颈
- 通过 JPA `ddl-auto=update` 自动管理表结构迁移

**风险**：不支持高并发写入、不支持 ALTER TABLE DROP COLUMN。未来如需扩展，可迁移到 PostgreSQL。

### 4.2 JWT 环境变量强制配置

**决策**：JWT 密钥从硬编码改为环境变量 `JWT_SECRET`，启动时校验长度 ≥ 32 字符。

**理由**：硬编码密钥意味着任何拿到源码的人都可以伪造任意用户 token。

**实现**：`UserService.@PostConstruct validateJwtConfig()`，`test` profile 允许使用临时密钥。

### 4.3 内部服务 Bearer Token 鉴权

**决策**：后端调用 face-recognition 和 album-rag 时携带 Bearer Token，Python 服务校验。

**理由**：Docker 网络内部服务虽然不对外暴露端口，但防止容器网络内未授权访问。

**实现**：`INTERNAL_SERVICE_TOKEN` 环境变量，后端通过 `RagVectorClient` 和 `FaceModelClient` 自动注入。

### 4.4 LLM 调用归主后端所有

**决策**：生产 Web 链路中的 LLM API Key 只配置在 `album-backend`，`album-rag` 定位为纯向量服务。

**理由**：
- `album-backend` 负责业务编排，需要调用 LLM 做图片描述生成和 AI 对话回答。
- `album-rag` 的线上职责只是文本 embedding、Qdrant 写入、Qdrant 搜索和索引删除，不需要访问外部 LLM。
- 避免在两个服务中重复配置 LLM Key，降低密钥泄露面和维护歧义。

**边界**：历史遗留的离线 CLI/调试工具链已经移除。`album-rag` 只保留生产 Web 链路需要的 FastAPI 向量接口、embedding 包装和 Qdrant 存储逻辑。

### 4.5 人物姓名搜索不依赖向量

**决策**：人名搜索直接查 `faces.face_name`，不走向量检索。

**理由**：
- 用户输入 `lxc的照片`，向量检索可能无法匹配 `lxc` 这个人名
- 人脸表已有精确的姓名字段，直接匹配更准确
- 向量检索用于语义搜索（场景、描述），人名搜索用于精确查找

**实现**：`FaceService.searchImagesByMentionedFaceNames()` 从用户已命名人物中提取匹配。

### 4.6 AI 会话后端持久化

**决策**：AI 聊天会话存储在后端数据库，前端不再使用 localStorage。

**理由**：
- localStorage 数据丢失风险（清缓存、换设备）
- 后端持久化支持多设备同步
- 后端控制上下文长度，避免前端传入过长历史

### 4.7 前端路由级懒加载

**决策**：所有页面组件使用 `React.lazy()` + `Suspense`，首屏只加载必要代码。

**理由**：原单包 1.47MB，拆包后最大 chunk 465KB，首页组件仅 8KB。

---

## 5. 数据库设计

### 5.1 ER 关系图

```
┌──────────┐     1:N     ┌──────────┐     1:N     ┌──────────────────┐
│   User   │────────────▶│  Image   │◀────────────│ FaceAppearance   │
│          │             │          │             │                  │
│ user_id  │             │ image_id │             │ face_apperance_id│
│ username │             │ user_id  │             │ image_id         │
│ password │             │ folder_id│             │ face_id          │
│ email    │             │ ...      │             │ bbox             │
│ ...      │             └────┬─────┘             └────────┬─────────┘
└────┬─────┘                  │                            │
     │                        │ N:1                        │ N:1
     │                   ┌────┴─────┐             ┌────────┴─────────┐
     │                   │  Folder  │             │      Face        │
     │                   │          │             │                  │
     │                   │ folder_id│             │ face_id          │
     │                   │ user_id  │             │ user_id          │
     │                   │ parent_id│◀── 自引用   │ face_name        │
     │                   │ name     │             │ embedding        │
     │                   └──────────┘             │ cover_path       │
     │                                            └──────────────────┘
     │
     │ 1:N    ┌─────────────────┐     1:N    ┌─────────────────┐
     ├───────▶│ AiChatSession   │───────────▶│ AiChatMessage   │
     │        │                 │            │                 │
     │        │ session_id      │            │ message_id      │
     │        │ user_id         │            │ session_id      │
     │        │ title           │            │ user_id         │
     │        └─────────────────┘            │ role / content  │
     │                                       └─────────────────┘
     │
     │ N:M    ┌──────────┐     ┌──────────────┐
     ├───────▶│   Role   │◀────│  UserRole    │
     │        │          │     │              │
     │        │ role_id  │     │ user_role_id │
     │        │ code     │     │ user_id      │
     │        └──────────┘     │ role_id      │
     │                         └──────────────┘
     │
     │ N:M    ┌────────────┐   ┌─────────────────┐
     └───────▶│ Permission │◀──│ UserPermission   │
              │            │   │                  │
              │ perm_id    │   │ user_permission_id│
              │ code       │   │ user_id          │
              │ module     │   │ permission_id    │
              └────────────┘   └─────────────────┘

其他独立表：
┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│  UploadTask     │  │  DownloadTask   │  │  AdminAuditLog   │
│  UploadFile     │  │  DownloadFile   │  │                  │
│  ImageAnalysis  │  │  PaymentOrder   │  │  RagPerformanceLog│
└─────────────────┘  └─────────────────┘  └──────────────────┘
```

### 5.2 表结构详情

#### User

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `user_id` | INTEGER | PK, AUTO INCREMENT | 用户 ID |
| `username` | VARCHAR(50) | NOT NULL, UNIQUE | 用户名 |
| `password_hash` | VARCHAR(255) | NOT NULL | BCrypt 密码哈希 |
| `email` | VARCHAR(100) | NOT NULL, UNIQUE | 邮箱 |
| `nickname` | VARCHAR(50) | DEFAULT '' | 昵称 |
| `avatar_filename` | VARCHAR(255) | | 头像文件名 |
| `is_member` | TINYINT(1) | DEFAULT 0 | 是否会员 |
| `membership_expire_at` | DATETIME | | 会员到期时间 |
| `status` | TINYINT | DEFAULT 1 | 状态（1=正常, 0=禁用） |
| `is_super_admin` | TINYINT(1) | DEFAULT 0 | 是否超级管理员 |
| `storage_used` | BIGINT | DEFAULT 0 | 已用存储（字节） |
| `storage_limit` | BIGINT | DEFAULT 1073741824 | 存储上限（默认 1GB） |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | |

**索引**：`idx_username(username)`, `idx_email(email)`, `idx_member_status(is_member, membership_expire_at)`

#### Image

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `image_id` | VARCHAR(36) | PK | UUID 主键 |
| `user_id` | INTEGER | NOT NULL, FK→User | 所属用户 |
| `folder_id` | INTEGER | FK→Folder | 所属文件夹 |
| `original_filename` | VARCHAR(255) | NOT NULL | 原始文件名 |
| `stored_filename` | VARCHAR(255) | NOT NULL | 存储文件名（UUID + 扩展名） |
| `thumbnail_filename` | VARCHAR(255) | | 缩略图文件名 |
| `file_size` | INTEGER | NOT NULL | 文件大小（字节） |
| `mime_type` | VARCHAR(50) | DEFAULT 'image/jpeg' | MIME 类型 |
| `upload_time` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 上传时间 |
| `is_in_recycle_bin` | TINYINT | DEFAULT 0 | 是否在回收站 |
| `moved_to_bin_at` | DATETIME | | 移入回收站时间 |
| `original_folder_id` | INTEGER | | 原始文件夹 ID（恢复用） |

**索引**：`idx_user(user_id)`, `idx_user_folder(user_id, folder_id)`, `idx_image_user_recycle(user_id, is_in_recycle_bin)`, `idx_upload(user_id, upload_time)`

#### faces

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `face_id` | INTEGER | PK, AUTO INCREMENT | 人物 ID |
| `user_id` | INTEGER | NOT NULL, FK→User | 所属用户 |
| `embedding` | TEXT | NOT NULL | 512 维 embedding（JSON 数组） |
| `cover_path` | TEXT | | 封面裁剪图路径 |
| `face_name` | VARCHAR(100) | | 用户命名 |
| `created_at` | DATETIME | NOT NULL | |
| `last_seen_at` | DATETIME | NOT NULL | 最近出现时间 |

**索引**：`idx_faces_user(user_id)`, `idx_faces_user_last_seen(user_id, last_seen_at)`

#### face_appearances

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `face_apperance_id` | INTEGER | PK, AUTO INCREMENT | |
| `image_id` | VARCHAR(36) | NOT NULL, FK→Image | 图片 ID |
| `face_id` | INTEGER | NOT NULL, FK→faces | 人物 ID |
| `bbox` | TEXT | NOT NULL | 人脸框坐标 JSON |
| `distance` | REAL | | 与 face embedding 的余弦距离 |
| `created_at` | DATETIME | NOT NULL | |

**索引**：`idx_face_appearances_face(face_id)`, `idx_face_appearances_image(image_id)`

#### Folder

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `folder_id` | INTEGER | PK, AUTO INCREMENT | |
| `user_id` | INTEGER | NOT NULL, FK→User | |
| `parent_id` | INTEGER | FK→Folder（自引用） | 父文件夹 |
| `name` | VARCHAR(255) | NOT NULL | 文件夹名 |
| `cover_image_id` | VARCHAR(36) | FK→Image | 封面图片 |
| `is_in_recycle_bin` | TINYINT | NOT NULL, DEFAULT 0 | |
| `moved_to_bin_at` | DATETIME | | |
| `original_parent_id` | INTEGER | | 原始父文件夹（恢复用） |
| `created_at` | DATETIME | NOT NULL | |
| `updated_at` | DATETIME | NOT NULL | |

**索引**：`idx_user_parent(user_id, parent_id)`, `idx_user_name(user_id, name)`, `idx_folder_user_recycle(user_id, is_in_recycle_bin)`
**唯一约束**：`uq_user_parent_name(user_id, parent_id, name)`

#### ImageAnalysis

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `image_analysis_id` | INTEGER | PK, AUTO INCREMENT | |
| `image_id` | VARCHAR(36) | NOT NULL, FK→Image | |
| `user_id` | INTEGER | NOT NULL | |
| `analysis_type` | VARCHAR(20) | NOT NULL, DEFAULT 'VECTOR' | 分析类型 |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | PENDING/PROCESSING/DONE/FAILED |
| `error_message` | VARCHAR(500) | | |
| `created_at` | DATETIME | | |
| `updated_at` | DATETIME | | |

**唯一约束**：`uq_image_analysis(image_id, analysis_type)`

#### ai_chat_session

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `session_id` | BIGINT | PK, AUTO INCREMENT | |
| `user_id` | INTEGER | NOT NULL | |
| `title` | VARCHAR(100) | NOT NULL, DEFAULT '新的对话' | |
| `deleted` | BOOLEAN | NOT NULL, DEFAULT false | 软删除 |
| `created_at` | DATETIME | | |
| `updated_at` | DATETIME | | |

**索引**：`idx_ai_session_user_updated(user_id, updated_at)`

#### ai_chat_message

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `message_id` | BIGINT | PK, AUTO INCREMENT | |
| `session_id` | BIGINT | NOT NULL, FK→ai_chat_session | |
| `user_id` | INTEGER | NOT NULL | |
| `role` | VARCHAR(20) | NOT NULL | user / assistant |
| `content` | VARCHAR(8000) | NOT NULL | 消息内容 |
| `references_json` | VARCHAR(8000) | | 引用图片 JSON |
| `created_at` | DATETIME | | |

**索引**：`idx_ai_message_session_created(session_id, created_at)`, `idx_ai_message_user_created(user_id, created_at)`

#### role / user_role / permission / user_permission

RBAC 四表：`role` 存角色定义，`user_role` 关联用户和角色，`permission` 存权限定义，`user_permission` 关联管理员和权限。

| 表 | PK | 关键字段 |
|----|-----|---------|
| `role` | role_id | code (UNIQUE): SUPER_ADMIN / ADMIN / USER |
| `user_role` | user_role_id | user_id + role_id (UNIQUE) |
| `permission` | permission_id | code (UNIQUE): user:view, log:export, ... |
| `user_permission` | user_permission_id | user_id + permission_id (UNIQUE) |

权限模型：
- `SUPER_ADMIN`：全权限，不需要查 user_permission 表
- `ADMIN`：读 user_permission 表获取权限列表
- `USER`：无后台权限

#### 其他表

| 表 | 说明 |
|----|------|
| `UploadTask` | 上传任务，UUID 主键，含进度字段 |
| `UploadFile` | 上传文件明细 |
| `DownloadTask` | 下载任务 |
| `DownloadFile` | 下载文件明细 |
| `AdminAuditLog` | 管理审计日志（操作人、动作、详情、IP） |
| `RagPerformanceLog` | RAG 性能日志（向量/LLM/DB 耗时） |
| `PaymentOrder` | 支付订单 |

### 5.3 索引策略

- **用户维度查询**几乎每张表都有 `user_id` 索引
- **回收站过滤**：`is_in_recycle_bin` 复合索引
- **时间排序**：`upload_time`、`created_at`、`updated_at` 索引
- **人脸匹配**：`face_id` 和 `image_id` 双向索引
- **向量搜索**：Qdrant 内部 HNSW 索引，按 `user_id` payload 过滤

---

## 6. 接口规范

### 6.1 统一响应格式

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功",
  "errorCode": null
}
```

错误响应：
```json
{
  "success": false,
  "data": null,
  "message": "错误描述",
  "errorCode": "ERROR_CODE"
}
```

### 6.2 认证方式

- JWT Bearer Token：`Authorization: Bearer <token>`
- Query Token（图片/头像下载）：`?token=<jwt>`
- 内部服务 Token：`Authorization: Bearer <INTERNAL_SERVICE_TOKEN>`

### 6.3 后端 REST API

#### AuthController (`/api/auth`)

| 方法 | 路径 | 说明 | 参数 | 返回 |
|------|------|------|------|------|
| POST | `/api/auth/login` | 登录 | Body: `{username, password}` | `{token}` |
| POST | `/api/auth/register` | 注册 | Body: `{username, password, confirmPassword, email, nickname?}` | `User` |

#### UserController (`/api/users`)

| 方法 | 路径 | 说明 | 参数 | 返回 |
|------|------|------|------|------|
| GET | `/api/users/me` | 获取当前用户 | - | `CurrentUserDTO` |
| PUT | `/api/users/me` | 更新资料 | Body: `{nickname?, email?}` | `CurrentUserDTO` |
| PUT | `/api/users/me/password` | 修改密码 | Body: `{currentPassword, newPassword}` | `Void` |
| POST | `/api/users/me/avatar` | 上传头像 | Multipart: `file` (JPG/PNG/WEBP, ≤2MB) | `CurrentUserDTO` |
| GET | `/api/users/me/avatar` | 获取头像 | - | 图片二进制 |

#### ImageController (`/api/images`)

| 方法 | 路径 | 说明 | 参数 | 返回 |
|------|------|------|------|------|
| POST | `/api/images` | 上传图片 | Multipart: `file`, Query: `folderId?` | `Image` |
| GET | `/api/images` | 获取图片列表 | Query: `folderId?`, `status?` (all/recycle) | `List<Image>` |
| GET | `/api/images/{id}` | 获取单张图片 | Path: `id` | `Image` |
| DELETE | `/api/images/{id}` | 删除图片 | Path: `id`, Query: `permanent?` | `Void` |
| PATCH | `/api/images/{id}` | 更新图片 | Body: `{folderId?, restore?}` | `Void` |
| POST | `/api/images/batch-move` | 批量移动 | Body: `{imageIds, folderId}` | `{movedCount, totalCount}` |
| DELETE | `/api/images/batch-delete` | 批量删除 | Body: `{imageIds, permanent?}` | `{deletedCount, totalCount}` |
| GET | `/api/images/stats` | 统计 | - | `{totalImages, totalStorage}` |
| GET | `/api/images/{id}/download` | 下载原图 | Path: `id` | 文件二进制 |
| GET | `/api/images/{id}/thumbnail` | 获取缩略图 | Path: `id` | 图片二进制 |
| GET | `/api/images/{id}/analysis` | 获取分析状态 | Path: `id` | `{status, errorMessage}` |

#### FolderController (`/api/folders`)

| 方法 | 路径 | 说明 | 参数 | 返回 |
|------|------|------|------|------|
| POST | `/api/folders` | 创建文件夹 | Body: `{parentId?, name}` | `Folder` |
| GET | `/api/folders` | 获取文件夹列表 | Query: `parentId?`, `status?` | `List<Folder>` |
| GET | `/api/folders/{id}` | 获取单个 | Path: `id` | `Folder` |
| PUT | `/api/folders/{id}` | 重命名 | Body: `{name}` | `Folder` |
| DELETE | `/api/folders/{id}` | 删除 | Path: `id` | `Void` |
| PATCH | `/api/folders/{id}` | 恢复/改封面 | Body: `{restore?, imageId?}` | `Void` |

#### UploadController (`/api/upload`)

| 方法 | 路径 | 说明 | 参数 | 返回 |
|------|------|------|------|------|
| POST | `/api/upload/tasks` | 创建上传任务 | Body: `{taskName, files: [{fileName, fileSize, fileType}]}` | `UploadTaskDTO` |
| GET | `/api/upload/tasks` | 获取任务列表 | - | `List<TaskProgressDTO>` |
| POST | `/api/upload/files/{taskId}` | 上传文件 | Multipart: `file`, Query: `fileIndex?`, `folderId?` | `UploadFileDTO` |
| GET | `/api/upload/tasks/{taskId}` | 获取进度 | Path: `taskId` | `TaskProgressDTO` |
| PATCH | `/api/upload/tasks/{taskId}/pause` | 暂停 | Path: `taskId` | `Void` |
| PATCH | `/api/upload/tasks/{taskId}/resume` | 继续 | Path: `taskId` | `Void` |
| DELETE | `/api/upload/tasks/{taskId}` | 取消 | Path: `taskId` | `Void` |
| POST | `/api/upload/tasks/{taskId}/retry` | 重试 | Path: `taskId` | `Void` |
| DELETE | `/api/upload/tasks/{taskId}/cleanup` | 清理临时文件 | Path: `taskId` | `Void` |

#### DownloadController (`/api/downloads`)

| 方法 | 路径 | 说明 | 参数 | 返回 |
|------|------|------|------|------|
| POST | `/api/downloads/tasks` | 创建下载任务 | Body: `{taskName, images: [{imageId, fileName, fileSize}]}` | `DownloadTaskDTO` |
| GET | `/api/downloads/tasks` | 获取任务列表 | - | `List<DownloadTaskDTO>` |
| GET | `/api/downloads/tasks/{taskId}` | 获取任务详情 | Path: `taskId` | `DownloadTaskDTO` |
| GET | `/api/downloads/tasks/{taskId}/files` | 获取文件列表 | Path: `taskId` | `List<DownloadFileDTO>` |
| PATCH | `/api/downloads/tasks/{taskId}/pause` | 暂停 | Path: `taskId` | `Void` |
| PATCH | `/api/downloads/tasks/{taskId}/resume` | 继续 | Path: `taskId` | `Void` |
| PATCH | `/api/downloads/tasks/{taskId}/cancel` | 取消 | Path: `taskId` | `Void` |
| PATCH | `/api/downloads/tasks/{taskId}/retry` | 重试 | Path: `taskId` | `Void` |
| DELETE | `/api/downloads/tasks/{taskId}` | 删除任务 | Path: `taskId` | `Void` |
| PATCH | `/api/downloads/tasks/{taskId}/files/{imageId}/complete` | 标记完成 | Path: `taskId`, `imageId` | `Void` |

#### FaceController (`/api/face`)

| 方法 | 路径 | 说明 | 参数 | 返回 |
|------|------|------|------|------|
| POST | `/api/face/remark` | 命名人物 | Body: `{userId, faceId, faceName}` | `{face_id, face_name}` |
| POST | `/api/face/merge` | 合并人物 | Body: `{userId, faceIds, selectedName?}` | 合并结果 |
| POST | `/api/face/delete` | 删除分类 | Body: `{userId, faceId}` | 删除结果 |
| POST | `/api/face/analyze` | 手动分析图片 | Body: `{userId, imageId}` | 分析结果 |
| GET | `/api/face/list` | 人物列表 | - | `List<{face_id, face_name, cover_path, ...}>` |
| GET | `/api/face/{faceId}/cover` | 获取封面图 | Path: `faceId` | 图片二进制 |
| GET | `/api/face/{faceId}/images` | 人物图片列表 | Path: `faceId` | `List<Image>` |
| POST | `/api/face/search` | 按姓名搜索 | Body: `{userId, faceName}` | 搜索结果 |

#### RagController (`/api/rag`)

| 方法 | 路径 | 说明 | 参数 | 返回 |
|------|------|------|------|------|
| POST | `/api/rag/search` | 智能搜索 | Body: `{query, topK?}` | `List<Image>` |
| POST | `/api/rag/chat` | AI 对话 | Body: `{message, history?}` | `ChatResponse` |

#### AiChatController (`/api/ai`)

| 方法 | 路径 | 说明 | 参数 | 返回 |
|------|------|------|------|------|
| GET | `/api/ai/sessions` | 会话列表 | - | `List<AiChatSessionDTO>` |
| POST | `/api/ai/sessions` | 创建会话 | - | `AiChatSessionDTO` |
| PATCH | `/api/ai/sessions/{sessionId}` | 改标题 | Body: `{title}` | `AiChatSessionDTO` |
| DELETE | `/api/ai/sessions/{sessionId}` | 删除会话 | Path: `sessionId` | `Void` |
| GET | `/api/ai/sessions/{sessionId}/messages` | 消息列表 | Path: `sessionId` | `List<AiChatMessageDTO>` |
| POST | `/api/ai/sessions/{sessionId}/chat` | 发送消息 | Path: `sessionId`, Body: `{message}` | `List<AiChatMessageDTO>` |

#### AdminController (`/api/admin`)

| 方法 | 路径 | 说明 | 权限 | 参数 | 返回 |
|------|------|------|------|------|------|
| GET | `/api/admin/users` | 用户列表 | user:view | - | `List<AdminUserDTO>` |
| POST | `/api/admin/users` | 创建用户 | user:create + SUPER_ADMIN(ADMIN 角色) | Body: `{username, password, confirmPassword, email, nickname?, role}` | `AdminUserDTO` |
| PATCH | `/api/admin/users/{id}/status` | 更新状态 | user:update | Body: `{status}` | `AdminUserDTO` |
| PATCH | `/api/admin/users/{id}/membership` | 更新会员 | user:update | Body: `{isMember}` | `AdminUserDTO` |
| PATCH | `/api/admin/users/{id}/storage-limit` | 更新配额 | user:update | Body: `{storageLimit}` | `AdminUserDTO` |
| GET | `/api/admin/permissions` | 权限列表 | role:view | - | `List<Permission>` |
| GET | `/api/admin/users/{id}/permissions` | 用户权限 | role:view | Path: `id` | `List<String>` |
| PUT | `/api/admin/users/{id}/permissions` | 更新权限 | role:assign + SUPER_ADMIN | Body: `{permissions}` | `List<String>` |
| GET | `/api/admin/logs/rag` | RAG 日志 | log:view | Query: `page, size, operationType?, keyword?` | `Page<RagPerformanceLog>` |
| GET | `/api/admin/logs/audit` | 审计日志 | log:view | Query: `page, size, category?, level?, action?, keyword?` | `Page<AdminAuditLog>` |
| GET | `/api/admin/tasks/uploads` | 上传任务 | task:view | Query: `page, size, status?, keyword?` | `Page<UploadTask>` |
| GET | `/api/admin/tasks/downloads` | 下载任务 | task:view | Query: `page, size, status?, keyword?` | `Page<DownloadTask>` |
| GET | `/api/admin/logs/rag/export` | 导出 RAG 日志 | log:export | - | CSV |
| GET | `/api/admin/logs/audit/export` | 导出审计日志 | log:export | - | CSV |
| GET | `/api/admin/tasks/uploads/export` | 导出上传任务 | task:export | - | CSV |
| GET | `/api/admin/tasks/downloads/export` | 导出下载任务 | task:export | - | CSV |

#### PaymentController (`/api/payment`)

| 方法 | 路径 | 说明 | 参数 | 返回 |
|------|------|------|------|------|
| POST | `/api/payment/create` | 创建订单 | Body: `{amount?, months?}` | `PaymentOrder` |
| POST | `/api/payment/confirm` | 确认支付 | Body: `{orderId}` | `PaymentOrder` |
| GET | `/api/payment/latest` | 最新订单 | - | `PaymentOrder` |

### 6.4 内部服务 API

#### face-recognition (`http://face-recognition:8001`)

| 方法 | 路径 | 说明 | 认证 | 参数 | 返回 |
|------|------|------|------|------|------|
| POST | `/api/v1/infer` | 人脸检测 | Bearer Token | Multipart: `image`, Form: `user_id`, `image_id` | `{status, code, message, count, results: [{bbox, embedding}]}` |
| GET | `/api/v1/health` | 健康检查 | 无 | - | `{status: "ok"}` |

#### album-rag (`http://rag:8003`)

`album-rag` 是内部向量服务。它只负责 embedding 与 Qdrant 检索，生产 Web 链路不在该服务内调用外部 LLM API。

| 方法 | 路径 | 说明 | 认证 | 参数 | 返回 |
|------|------|------|------|------|------|
| POST | `/index` | 建立索引 | Bearer Token | Body: `{user_id, image_id, description}` | `{success, point_id, embedding_time_ms}` |
| POST | `/search` | 向量搜索 | Bearer Token | Body: `{user_id, query, top_k}` | `{results: [{image_id, score, description}], ...}` |
| DELETE | `/index/{user_id}/{image_id}` | 删除索引 | Bearer Token | Path: `user_id`, `image_id` | `{success, deleted_count}` |
| GET | `/health` | 健康检查 | 无 | - | `{status, collection, point_count}` |

---

## 7. 测试文档

### 7.1 当前状态

项目目前没有测试源码。`mvn test` 输出 `No tests to run.`，`BUILD SUCCESS`。

### 7.2 建议测试策略

```
┌─────────────────────────────────────────────┐
│              E2E 测试（少量）                 │
│  完整上传→识别→搜索→对话流程                 │
├─────────────────────────────────────────────┤
│           集成测试（中量）                    │
│  Controller → Service → Repository → DB     │
│  使用 @SpringBootTest + 内存 SQLite          │
├─────────────────────────────────────────────┤
│          单元测试（大量）                     │
│  Service 层逻辑、工具类、DTO 转换             │
│  使用 Mockito mock 依赖                      │
└─────────────────────────────────────────────┘
```

### 7.3 如何新增测试

#### 后端单元测试

1. 在 `src/test/java/com/photo/backend/` 下创建测试类
2. 使用 `@ExtendWith(MockitoExtension.class)` + `@Mock` + `@InjectMocks`
3. 运行：`mvn test`

示例结构：

```java
@ExtendWith(MockitoExtension.class)
class ImageServiceTest {
    @Mock private ImageRepository imageRepository;
    @Mock private UserService userService;
    @InjectMocks private ImageService imageService;

    @Test
    void uploadImage_shouldRejectEmptyFile() {
        // given
        MultipartFile emptyFile = mock(MultipartFile.class);
        when(emptyFile.isEmpty()).thenReturn(true);

        // when & then
        assertThrows(RuntimeException.class,
            () -> imageService.uploadImage(emptyFile, 1, null));
    }
}
```

#### 后端集成测试

1. 使用 `@SpringBootTest` + `@Transactional`（自动回滚）
2. 使用 `TestRestTemplate` 或 `MockMvc` 测试 HTTP 接口
3. 需要配置 `src/test/resources/application-test.properties`

#### 前端测试

1. 安装 `vitest` + `@testing-library/react`
2. 组件测试：渲染组件、模拟交互、验证输出
3. API 测试：mock axios、验证请求参数

### 7.4 Docker 容器内运行测试

```bash
# 后端测试
docker run --rm \
  -e JWT_SECRET=test-only-jwt-secret-with-at-least-32-chars \
  -e INTERNAL_SERVICE_TOKEN=test-only-internal-service-token-with-at-least-32-chars \
  -v "$PWD/album-backend:/app" \
  -v "$HOME/.m2:/root/.m2" \
  -w /app \
  maven:3.9-eclipse-temurin-21 mvn test

# 前端测试
cd album-frontend && npm run build
```
