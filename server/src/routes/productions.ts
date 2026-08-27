/**
 * 成片路由：成片 CRUD、成片-素材关联（素材使用次数由此累计）
 * 权限：非管理员仅能编辑/删除自己创建的成片；素材引用与查询对全员开放
 */
import { Router } from 'express';
import { db, nextProductionCode } from '../lib/db.js';
import type { AuthedRequest } from './auth.js';
import { notifyChanged } from '../services/realtimeService.js';

export const productionsRouter = Router();

// ---- 列表 ----
/** GET /api/productions - 成片列表（含素材数量与创建人） */
productionsRouter.get('/', (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const where = search ? `WHERE p.title LIKE ? OR p.code LIKE ?` : '';
  const params = search ? [`%${search}%`, `%${search}%`] : [];
  const items = db
    .prepare(
      `SELECT p.*,
        m.nickname AS creator_name,
        (SELECT COUNT(*) FROM production_assets pa WHERE pa.production_id = p.id) AS assetCount
       FROM productions p
       LEFT JOIN members m ON m.id = p.created_by
       ${where}
       ORDER BY p.created_at DESC`,
    )
    .all(...params) as unknown as Array<Record<string, unknown>>;
  res.json(items);
});

// ---- 创建 ----
/** POST /api/productions - 新建成片 */
productionsRouter.post('/', (req, res) => {
  const member = (req as AuthedRequest).member;
  const { title, duration, description, coverPath } = (req.body ?? {}) as {
    title?: string;
    duration?: number | null;
    description?: string;
    coverPath?: string | null;
  };
  if (!title?.trim()) {
    res.status(400).json({ error: '成片标题不能为空' });
    return;
  }
  const code = nextProductionCode();
  const info = db
    .prepare(
      `INSERT INTO productions (code, title, duration, description, cover_path, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(code, title.trim(), duration ?? null, description ?? null, coverPath ?? null, member?.id ?? null);
  notifyChanged('productions');
  res
    .status(201)
    .json(db.prepare(`SELECT * FROM productions WHERE id = ?`).get(info.lastInsertRowid) as unknown);
});

// ---- 详情 ----
/** GET /api/productions/:id - 成片详情（含引用素材列表） */
productionsRouter.get('/:id', (req, res) => {
  const p = db.prepare(`SELECT * FROM productions WHERE id = ?`).get(Number(req.params.id));
  if (!p) {
    res.status(404).json({ error: '成片不存在' });
    return;
  }
  const assets = db
    .prepare(
      `SELECT pa.id AS relation_id, pa.note, pa.created_at AS used_at,
              a.id, a.code, a.filename, a.duration, a.thumbnail_path
       FROM production_assets pa
       JOIN assets a ON a.id = pa.asset_id
       WHERE pa.production_id = ?
       ORDER BY pa.created_at`,
    )
    .all(Number(req.params.id));
  res.json({ ...p, assets });
});

// ---- 更新 ----
/** PATCH /api/productions/:id - 更新成片信息（非管理员仅限自己的成片） */
productionsRouter.patch('/:id', (req, res) => {
  const member = (req as AuthedRequest).member!;
  const { title, duration, description, coverPath, publishStatus } = (req.body ?? {}) as {
    title?: string;
    duration?: number | null;
    description?: string;
    coverPath?: string | null;
    publishStatus?: string;
  };
  const cur = db.prepare(`SELECT created_by FROM productions WHERE id = ?`).get(Number(req.params.id)) as
    | { created_by: number | null }
    | undefined;
  if (!cur) {
    res.status(404).json({ error: '成片不存在' });
    return;
  }
  if (member.is_admin !== 1 && cur.created_by !== member.id) {
    res.status(403).json({ error: '只能编辑自己创建的成片' });
    return;
  }
  db.prepare(
    `UPDATE productions SET
       title = COALESCE(?, title),
       duration = COALESCE(?, duration),
       description = COALESCE(?, description),
       cover_path = COALESCE(?, cover_path),
       publish_status = COALESCE(?, publish_status),
       updated_at = datetime('now')
     WHERE id = ?`,
  ).run(
    title?.trim() ?? null,
    duration === undefined ? null : duration,
    description ?? null,
    coverPath ?? null,
    publishStatus ?? null,
    Number(req.params.id),
  );
  notifyChanged('productions');
  res.json(db.prepare(`SELECT * FROM productions WHERE id = ?`).get(Number(req.params.id)) as unknown);
});

// ---- 删除 ----
/** DELETE /api/productions/:id - 删除成片（非管理员仅限自己的） */
productionsRouter.delete('/:id', (req, res) => {
  const member = (req as AuthedRequest).member!;
  const id = Number(req.params.id);
  const cur = db.prepare(`SELECT created_by FROM productions WHERE id = ?`).get(id) as
    | { created_by: number | null }
    | undefined;
  if (!cur) {
    res.status(404).json({ error: '成片不存在' });
    return;
  }
  if (member.is_admin !== 1 && cur.created_by !== member.id) {
    res.status(403).json({ error: '只能删除自己创建的成片' });
    return;
  }
  db.prepare(`DELETE FROM productions WHERE id = ?`).run(id);
  notifyChanged('productions');
  res.json({ ok: true });
});

// ---- 素材关联 ----
/** POST /api/productions/:id/assets - 添加素材到成片（素材使用次数 +1） */
productionsRouter.post('/:id/assets', (req, res) => {
  const member = (req as AuthedRequest).member;
  const { assetIds, note } = (req.body ?? {}) as { assetIds?: number[]; note?: string };
  const pid = Number(req.params.id);
  const exists = db.prepare(`SELECT id FROM productions WHERE id = ?`).get(pid);
  if (!exists) {
    res.status(404).json({ error: '成片不存在' });
    return;
  }
  if (!Array.isArray(assetIds) || assetIds.length === 0) {
    res.status(400).json({ error: '请选择要添加的素材' });
    return;
  }
  const insert = db.prepare(
    `INSERT OR IGNORE INTO production_assets (production_id, asset_id, note, created_by) VALUES (?, ?, ?, ?)`,
  );
  let added = 0;
  for (const aid of [...new Set(assetIds)]) {
    const r = insert.run(pid, Number(aid), note ?? null, member?.id ?? null);
    added += Number(r.changes);
  }
  if (added > 0) notifyChanged('assets');
  res.status(201).json({ added, message: `已添加 ${added} 个素材引用` });
});

/** DELETE /api/productions/:id/assets/:relationId - 移除素材引用（使用次数 -1） */
productionsRouter.delete('/:id/assets/:relationId', (req, res) => {
  const info = db
    .prepare(`DELETE FROM production_assets WHERE id = ? AND production_id = ?`)
    .run(Number(req.params.relationId), Number(req.params.id));
  if (Number(info.changes) > 0) notifyChanged('assets');
  res.status(Number(info.changes) > 0 ? 200 : 404).json(
    Number(info.changes) > 0 ? { ok: true } : { error: '关联不存在' },
  );
});
