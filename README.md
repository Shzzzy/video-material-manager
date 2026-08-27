# 创意素材工作台 · CreativeAsset Workspace

> 让每一条素材都可查、可用、可追踪

面向视频创作团队的素材管理网站：**自动分类拍摄素材**、**追踪素材使用次数**，内置**素材库**与**成片库**两大板块，并预留**视频发布 API** 与 **AI 视频制作 API** 的外接适配器（接口文档就绪后即可接入）。

## ✨ 功能特性

### 素材库
- **素材录入**：浏览器上传（拖拽、多文件、最大 4GB）或扫描服务器文件夹（递归、SSE 实时进度）
- **自动处理**：入库自动生成编号（AS-0001）、缩略图、SHA-256 指纹（重复文件自动去重）、元数据（时长 / 分辨率 / 帧率）
- **自定义分类标签**：用户自定义分类维度（如：拍摄人员、场景、景别、剪辑人员），每个维度下自由增删标签值
- **检索**：按编号 / 文件名 / 标签搜索，组合筛选，多标签命中
- **使用次数**：素材被成片引用自动累计次数，展示完整使用记录（时间 / 成片 / 用途）

### 成片库
- 成片管理：标题、描述、发布状态（草稿 / 已发布）
- **素材引用**：从素材库勾选素材加入成片，**引用即累计使用次数**
- 素材使用排行：统计被引用最多的素材

### 使用记录
- 时间轴展示每一次素材引用事件，可跳转素材 / 成片详情

### 团队协作（手机号 + 密码账户体系）
- **注册登录**：手机号 + 密码注册/登录（手机号仅作账号，无需短信验证），密码加密存储
- **核心管理员**：第一个注册的账号输入【初始化管理员码】成为核心管理员（固定 1 个，不可增减、不可禁用）
- **用户管理**：管理员可禁用/启用成员账号（禁用即时下线）、重置成员密码、查看登录记录
- **登录保护**：连续输错 5 次密码锁定 10 分钟，防暴力破解
- **操作留痕**：上传/打标/删除均记录操作人昵称，可追溯
- **删除权限**：成员可删除自己上传的内容，管理员可删除全部
- **实时同步**：成员操作后，其他在线成员界面自动刷新（SSE 广播）

### 预留接口（适配器框架）
- `ai-vision`：AI 视觉分类（素材自动打标）— 未配置时降级手动打标
- `publish`：视频发布（成片发布到外部平台）
- `ai-video`：AI 视频制作

> 接口文档由合作方提供后，在 `server/src/adapters/` 下按协议填充实现即可。

## 🛠 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS v4 + Framer Motion |
| 后端 | Node.js + Express + node:sqlite（零原生依赖） |
| 视频处理 | ffmpeg-static / ffprobe-static（无需系统安装 ffmpeg） |
| 数据库 | SQLite（WAL 模式，单文件，可平滑迁移 PostgreSQL） |

## 🚀 快速开始

### 环境要求
- Node.js ≥ 22.5（使用内置 `node:sqlite`）
- npm ≥ 10

### 安装与启动

```bash
npm install
npm run dev
```

首次启动后端会在控制台打印**初始化管理员码**（一次性，形如 `ADMIN-XXXX`），
打开前端页面注册第一个账号时输入该码，即可成为核心管理员（固定一个）；
其他成员直接注册（手机号 + 密码）即可使用。管理员可在顶栏（金色标识）→ 用户管理
中禁用/启用成员、重置密码。

- 前端：http://localhost:5175
- 后端 API：http://localhost:4100（/api/health 健康检查）

### 生产构建（团队部署）

```bash
npm run build   # 构建前端到 client/dist（后端自动托管）
npm start       # 后端服务：API + 前端页面同一端口
```

内网团队部署：构建后把项目放到内网服务器，`npm start` 即可，团队成员通过
`http://服务器IP:4100` 访问，输入邀请码加入。数据库与上传文件在 `server/data/`，定期备份该目录即可。

### 数据与存储
- 数据库与上传文件位于 `server/data/`（`uploads/` 原片、`thumbs/` 缩略图、`assets.db` 数据库）
- 原片仅保存在本地服务器，不上传任何云端服务

## 📁 目录结构

```
creative-asset-workspace/
├── client/                 # React 前端
│   └── src/
│       ├── components/     # 布局、卡片、抽屉、对话框
│       ├── pages/          # 素材库 / 成片库 / 使用记录 / 标签管理
│       ├── api.ts          # API 客户端
│       └── store.tsx       # 全局状态
├── server/                 # Express 后端
│   └── src/
│       ├── routes/         # 素材 / 分类标签 / 成片 / 统计 / 适配器
│       ├── services/       # 素材入库、文件夹扫描
│       ├── lib/            # 数据库、视频处理（ffmpeg）
│       └── adapters/       # 预留：ai-vision / publish / ai-video
├── docs/                   # 需求文档
└── package.json            # npm workspaces
```

## 📡 API 一览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/assets | 素材列表（搜索/标签/状态/分页） |
| POST | /api/assets/upload | 上传素材（multipart） |
| POST | /api/assets/scan | 扫描文件夹（SSE 进度） |
| GET/PATCH/DELETE | /api/assets/:id | 素材详情 / 更新（标签）/ 删除 |
| GET/POST/PATCH/DELETE | /api/categories | 分类维度 CRUD |
| POST/PATCH/DELETE | /api/categories/tags | 标签 CRUD |
| GET/POST/PATCH/DELETE | /api/productions | 成片 CRUD |
| POST | /api/productions/:id/assets | 添加素材引用（使用次数 +1） |
| DELETE | /api/productions/:id/assets/:relId | 移除引用 |
| GET | /api/stats/overview | 总览统计 |
| GET | /api/stats/usage | 使用记录流 |
| GET | /api/adapters | 外部适配器状态 |

## 🗺 路线图

- [x] M1 项目骨架 + 素材库（上传/扫描/缩略图/编号/指纹/自定义标签）
- [x] M2 成片库 + 素材关联 + 使用次数统计 + 使用记录
- [x] M3 搜索筛选 + 统计概览 + 空状态引导
- [ ] M4 适配器接入：AI 分类 / 视频发布 / AI 视频制作（待接口文档）
- [ ] M5 多用户与权限、对象存储扩展
