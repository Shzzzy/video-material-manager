/**
 * 应用入口：Express 服务
 * - 静态托管上传文件与缩略图
 * - 挂载全部 API 路由
 */
import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { initDb, DATA_DIR } from './lib/db.js';
import { assetsRouter } from './routes/assets.js';
import { categoriesRouter } from './routes/categories.js';
import { productionsRouter } from './routes/productions.js';
import { statsRouter } from './routes/stats.js';
import { adaptersRouter } from './routes/adapters.js';

const PORT = Number(process.env.PORT ?? 4100);

// 初始化数据库
initDb();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

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

app.listen(PORT, () => {
  console.log(`[server] 创意素材工作台 API 已启动: http://127.0.0.1:${PORT}`);
  console.log(`[server] 数据目录: ${DATA_DIR}（不存在时将自动创建）`);
  if (!existsSync(DATA_DIR)) console.log('[server] 数据目录已自动创建');
});
