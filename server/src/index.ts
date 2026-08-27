/**
 * 应用入口：Express 服务
 * - 无账户团队体系：邀请码加入 + token 识别 + 管理员权限
 * - 静态托管上传文件与缩略图、前端构建产物
 * - 挂载全部 API 路由
 */
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb, DATA_DIR } from './lib/db.js';
import { bootstrapAdminCode, memberByToken, type Member } from './services/authService.js';
import { assetsRouter } from './routes/assets.js';
import { categoriesRouter } from './routes/categories.js';
import { productionsRouter } from './routes/productions.js';
import { statsRouter } from './routes/stats.js';
import { adaptersRouter } from './routes/adapters.js';
import { authRouter } from './routes/auth.js';

const PORT = Number(process.env.PORT ?? 4100);
const __dirname = dirname(fileURLToPath(import.meta.url));

// 初始化数据库 + 管理员激活码
initDb();
bootstrapAdminCode();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

/** 扩展请求类型：携带当前成员 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      member?: Member;
    }
  }
}

// ---- 认证中间件：除健康检查与加入接口外，全部要求成员 token ----
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  // 白名单：无需 token
  if (req.path === '/health' || req.path === '/auth/join') {
    next();
    return;
  }
  const token =
    (req.headers['x-member-token'] as string | undefined) ||
    (typeof req.query.token === 'string' ? req.query.token : undefined);
  const member = memberByToken(token ?? '');
  if (!member) {
    res.status(401).json({ error: '未加入工作台或会话已失效' });
    return;
  }
  req.member = member;
  next();
});

// 静态资源：上传的原片与缩略图
app.use('/media', (req, res, next) => {
  // 仅放行媒体文件，防止目录穿越
  const path = req.path.replace(/^\/+/, '');
  if (path.includes('..') || path.includes(':')) {
    res.status(403).json({ error: '非法路径' });
    return;
  }
  next();
});
app.use('/media', express.static(DATA_DIR, { fallthrough: false }));

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// 身份路由
app.use('/api/auth', authRouter);

// 业务路由
app.use('/api/assets', assetsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/productions', productionsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/adapters', adaptersRouter);

// 兜底 404
app.use('/api', (_req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 前端构建产物托管（生产模式）
const clientDist = join(__dirname, '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/media).*/, (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
  console.log(`[server] 前端构建产物托管: ${clientDist}`);
} else {
  console.log('[server] 未找到 client/dist（开发模式请用 vite dev 访问前端）');
}

app.listen(PORT, () => {
  console.log(`[server] 创意素材工作台 API 已启动: http://127.0.0.1:${PORT}`);
  console.log(`[server] 数据目录: ${DATA_DIR}`);
});
