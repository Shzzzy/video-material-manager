/**
 * 统计路由：素材总量、分类分布、使用排行、使用记录
 */
import { Router } from 'express';
import { db } from '../lib/db.js';

export const statsRouter = Router();

/** GET /api/stats/overview - 总览统计 */
statsRouter.get('/overview', (_req, res) => {
  const assetTotal = (
    db.prepare(`SELECT COUNT(*) AS n FROM assets`).get() as { n: number }
  ).n;
  const productionTotal = (
    db.prepare(`SELECT COUNT(*) AS n FROM productions`).get() as { n: number }
  ).n;
  const usedCount = (
    db.prepare(`SELECT COUNT(DISTINCT asset_id) AS n FROM production_assets`).get() as { n: number }
  ).n;
  const usageTotal = (
    db.prepare(`SELECT COUNT(*) AS n FROM production_assets`).get() as { n: number }
  ).n;
  const totalDuration = (
    db.prepare(`SELECT COALESCE(SUM(duration), 0) AS n FROM assets`).get() as { n: number }
  ).n;
  // 待标注：未使用、无标签
  const pendingCount = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM assets a
         WHERE NOT EXISTS (SELECT 1 FROM production_assets pa WHERE pa.asset_id = a.id)
           AND NOT EXISTS (SELECT 1 FROM asset_tags at WHERE at.asset_id = a.id)`,
      )
      .get() as { n: number }
  ).n;

  res.json({
    assetTotal,
    productionTotal,
    usedCount,
    usageTotal,
    totalDuration,
    pendingCount,
  });
});

/** GET /api/stats/categories - 分类分布（每个标签命中的素材数） */
statsRouter.get('/categories', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT c.id AS category_id, c.name AS category_name, t.id AS tag_id, t.name AS tag_name, t.color,
              COUNT(at.asset_id) AS count
       FROM categories c
       JOIN tags t ON t.category_id = c.id
       LEFT JOIN asset_tags at ON at.tag_id = t.id
       GROUP BY t.id
       ORDER BY c.sort_order, t.sort_order`,
    )
    .all() as Array<Record<string, unknown>>;

  const map = new Map<number, Record<string, unknown>>();
  for (const r of rows) {
    const cid = r.category_id as number;
    if (!map.has(cid)) {
      map.set(cid, {
        id: cid,
        name: r.category_name,
        tags: [],
      });
    }
    (map.get(cid)!.tags as unknown[]).push({
      id: r.tag_id,
      name: r.tag_name,
      color: r.color,
      count: r.count,
    });
  }
  res.json([...map.values()]);
});

/** GET /api/stats/usage-ranking - 素材使用次数排行 */
statsRouter.get('/usage-ranking', (_req, res) => {
  const limit = Math.min(50, Math.max(1, Number(_req.query.limit ?? 10)));
  const rows = db
    .prepare(
      `SELECT a.id, a.code, a.filename, a.thumbnail_path, COUNT(pa.id) AS usageCount
       FROM assets a
       JOIN production_assets pa ON pa.asset_id = a.id
       GROUP BY a.id
       ORDER BY usageCount DESC, a.updated_at DESC
       LIMIT ?`,
    )
    .all(limit);
  res.json(rows);
});

/** GET /api/stats/usage - 使用记录（按时间倒序，可筛选素材/成片） */
statsRouter.get('/usage', (req, res) => {
  const assetId = Number(req.query.assetId ?? 0) || undefined;
  const productionId = Number(req.query.productionId ?? 0) || undefined;
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (assetId) {
    where.push('pa.asset_id = ?');
    params.push(assetId);
  }
  if (productionId) {
    where.push('pa.production_id = ?');
    params.push(productionId);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT pa.id, pa.note, pa.created_at,
              a.id AS asset_id, a.code AS asset_code, a.filename, a.thumbnail_path,
              p.id AS production_id, p.code AS production_code, p.title AS production_title
       FROM production_assets pa
       JOIN assets a ON a.id = pa.asset_id
       JOIN productions p ON p.id = pa.production_id
       ${whereSql}
       ORDER BY pa.created_at DESC
       LIMIT 200`,
    )
    .all(...params);
  res.json(rows);
});
