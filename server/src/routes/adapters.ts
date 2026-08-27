/**
 * 适配器路由：查询外部 API 适配器状态（AI 分类 / 视频发布 / AI 视频制作）
 * 具体接入待用户提供接口文档后实现
 */
import { Router } from 'express';
import { listAdapterStatus, invokeAdapter, type AdapterName } from '../adapters/index.js';

export const adaptersRouter = Router();

/** GET /api/adapters - 适配器状态列表 */
adaptersRouter.get('/', (_req, res) => {
  res.json(listAdapterStatus());
});

/** POST /api/adapters/:name/invoke - 预留调用入口 */
adaptersRouter.post('/:name/invoke', async (req, res) => {
  const name = req.params.name as AdapterName;
  if (!['ai-vision', 'publish', 'ai-video'].includes(name)) {
    res.status(400).json({ error: '未知适配器' });
    return;
  }
  try {
    const result = await invokeAdapter(name, (req.body ?? {}) as Record<string, unknown>);
    res.json({ ok: true, result });
  } catch (e) {
    res.status(501).json({ error: e instanceof Error ? e.message : String(e) });
  }
});
