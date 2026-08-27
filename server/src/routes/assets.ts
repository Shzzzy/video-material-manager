/**
 * 素材路由：上传、文件夹扫描（SSE 进度）、列表、详情、更新、删除
 */
import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { UPLOAD_DIR } from '../lib/db.js';
import {
  registerAsset,
  listAssets,
  getAssetDetail,
  updateAsset,
  deleteAsset,
  isVideoFile,
  type AssetFilters,
} from '../services/assetService.js';
import { scanFolder } from '../services/scanService.js';

export const assetsRouter = Router();

// ---- 上传 ----
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = file.originalname.includes('.')
        ? file.originalname.slice(file.originalname.lastIndexOf('.'))
        : '';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 4 * 1024 * 1024 * 1024 }, // 单文件上限 4GB
});

/** POST /api/assets/upload - 上传视频素材（支持多文件） */
assetsRouter.post('/upload', upload.array('files'), async (req, res) => {
  const files = (req.files as Express.Multer.File[]) ?? [];
  if (files.length === 0) {
    res.status(400).json({ error: '未收到文件' });
    return;
  }
  try {
    const results = [];
    for (const f of files) {
      if (!isVideoFile(f.originalname)) {
        results.push({ filename: f.originalname, error: '不支持的视频格式' });
        continue;
      }
      try {
        const asset = await registerAsset(f.path, f.originalname, 'upload');
        results.push({ filename: f.originalname, asset });
      } catch (e) {
        results.push({
          filename: f.originalname,
          error: e instanceof Error ? e.message : '入库失败',
        });
      }
    }
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : '上传失败' });
  }
});

// ---- 文件夹扫描（SSE 进度推送） ----
/** POST /api/assets/scan - 扫描服务器本地文件夹 */
assetsRouter.post('/scan', (req, res) => {
  const { folder } = (req.body ?? {}) as { folder?: string };
  if (!folder) {
    res.status(400).json({ error: '请提供要扫描的文件夹路径' });
    return;
  }
  // 建立 SSE 连接
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (p: unknown) => res.write(`data: ${JSON.stringify(p)}\n\n`);

  scanFolder(folder, (progress) => {
    send(progress);
    if (progress.phase === 'done' || progress.phase === 'error') {
      res.end();
    }
  }).catch((e) => {
    send({ phase: 'error', error: e instanceof Error ? e.message : String(e) });
    res.end();
  });

  // 客户端断开时销毁响应（注意：req 'close' 在请求体读完时即触发，不能用于 SSE 结束判断）
  req.on('aborted', () => res.destroy());
});

// ---- 列表 ----
/** GET /api/assets - 素材列表（搜索/筛选/分页） */
assetsRouter.get('/', (req, res) => {
  const q = req.query;
  const filters: AssetFilters = {
    search: typeof q.search === 'string' ? q.search : undefined,
    golden3sOnly: q.golden3s === '1' || q.golden3s === 'true',
    page: q.page ? Math.max(1, Number(q.page)) : 1,
    pageSize: q.pageSize ? Math.min(200, Math.max(1, Number(q.pageSize))) : 60,
  };
  if (typeof q.tagIds === 'string' && q.tagIds) {
    filters.tagIds = q.tagIds.split(',').map(Number).filter(Number.isFinite);
  }
  res.json(listAssets(filters));
});

// ---- 详情 ----
/** GET /api/assets/:id - 素材详情（标签 + 使用次数 + 使用记录） */
assetsRouter.get('/:id', (req, res) => {
  const detail = getAssetDetail(Number(req.params.id));
  if (!detail) {
    res.status(404).json({ error: '素材不存在' });
    return;
  }
  res.json(detail);
});

// ---- 更新 ----
/** PATCH /api/assets/:id - 更新素材（标签、黄金3秒） */
assetsRouter.patch('/:id', (req, res) => {
  const { tagIds, golden3s } = (req.body ?? {}) as { tagIds?: number[]; golden3s?: boolean };
  const updated = updateAsset(Number(req.params.id), { tagIds, golden3s });
  if (!updated) {
    res.status(404).json({ error: '素材不存在' });
    return;
  }
  res.json(updated);
});

// ---- 删除 ----
/** DELETE /api/assets/:id */
assetsRouter.delete('/:id', (req, res) => {
  const ok = deleteAsset(Number(req.params.id));
  res.status(ok ? 200 : 404).json(ok ? { ok: true } : { error: '素材不存在' });
});
