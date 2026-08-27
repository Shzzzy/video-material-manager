/**
 * 分类维度与标签路由：用户自定义标签体系（如：拍摄人员、场景、景别、剪辑人员）
 */
import { Router } from 'express';
import { db } from '../lib/db.js';

export const categoriesRouter = Router();

// ---- 分类维度 ----
/** GET /api/categories - 全部分类维度（含标签） */
categoriesRouter.get('/', (_req, res) => {
  const categories = db
    .prepare(`SELECT * FROM categories ORDER BY sort_order, id`)
    .all() as Array<Record<string, unknown>>;
  const tags = db
    .prepare(`SELECT * FROM tags ORDER BY sort_order, id`)
    .all() as Array<Record<string, unknown>>;
  res.json(
    categories.map((c) => ({
      ...c,
      tags: tags.filter((t) => t.category_id === c.id),
    })),
  );
});

/** POST /api/categories - 新建分类维度 */
categoriesRouter.post('/', (req, res) => {
  const { name, sortOrder = 0 } = (req.body ?? {}) as { name?: string; sortOrder?: number };
  if (!name?.trim()) {
    res.status(400).json({ error: '分类名称不能为空' });
    return;
  }
  try {
    const info = db
      .prepare(`INSERT INTO categories (name, sort_order) VALUES (?, ?)`)
      .run(name.trim(), sortOrder);
    res.status(201).json(db.prepare(`SELECT * FROM categories WHERE id = ?`).get(info.lastInsertRowid));
  } catch (e) {
    res.status(409).json({ error: e instanceof Error && e.message.includes('UNIQUE') ? '分类已存在' : '创建失败' });
  }
});

/** PATCH /api/categories/:id - 重命名/排序 */
categoriesRouter.patch('/:id', (req, res) => {
  const { name, sortOrder } = (req.body ?? {}) as { name?: string; sortOrder?: number };
  const cur = db.prepare(`SELECT * FROM categories WHERE id = ?`).get(Number(req.params.id));
  if (!cur) {
    res.status(404).json({ error: '分类不存在' });
    return;
  }
  if (name !== undefined) {
    db.prepare(`UPDATE categories SET name = ? WHERE id = ?`).run(name.trim(), Number(req.params.id));
  }
  if (sortOrder !== undefined) {
    db.prepare(`UPDATE categories SET sort_order = ? WHERE id = ?`).run(sortOrder, Number(req.params.id));
  }
  res.json(db.prepare(`SELECT * FROM categories WHERE id = ?`).get(Number(req.params.id)));
});

/** DELETE /api/categories/:id - 删除分类（级联删除标签与关联） */
categoriesRouter.delete('/:id', (req, res) => {
  const info = db.prepare(`DELETE FROM categories WHERE id = ?`).run(Number(req.params.id));
  res.status(info.changes > 0 ? 200 : 404).json(info.changes > 0 ? { ok: true } : { error: '分类不存在' });
});

// ---- 标签 ----
/** POST /api/tags - 在分类下新建标签 */
categoriesRouter.post('/tags', (req, res) => {
  const { categoryId, name, color, sortOrder = 0 } = (req.body ?? {}) as {
    categoryId?: number;
    name?: string;
    color?: string;
    sortOrder?: number;
  };
  if (!categoryId || !name?.trim()) {
    res.status(400).json({ error: '分类与标签名称不能为空' });
    return;
  }
  try {
    const info = db
      .prepare(`INSERT INTO tags (category_id, name, color, sort_order) VALUES (?, ?, ?, ?)`)
      .run(categoryId, name.trim(), color ?? '#5B7C6B', sortOrder);
    res.status(201).json(db.prepare(`SELECT * FROM tags WHERE id = ?`).get(info.lastInsertRowid));
  } catch (e) {
    res
      .status(409)
      .json({ error: e instanceof Error && e.message.includes('UNIQUE') ? '该分类下标签已存在' : '创建失败' });
  }
});

/** PATCH /api/tags/:id - 重命名/改色/排序 */
categoriesRouter.patch('/tags/:id', (req, res) => {
  const { name, color, sortOrder } = (req.body ?? {}) as {
    name?: string;
    color?: string;
    sortOrder?: number;
  };
  const cur = db.prepare(`SELECT * FROM tags WHERE id = ?`).get(Number(req.params.id));
  if (!cur) {
    res.status(404).json({ error: '标签不存在' });
    return;
  }
  if (name !== undefined) db.prepare(`UPDATE tags SET name = ? WHERE id = ?`).run(name.trim(), Number(req.params.id));
  if (color !== undefined) db.prepare(`UPDATE tags SET color = ? WHERE id = ?`).run(color, Number(req.params.id));
  if (sortOrder !== undefined) db.prepare(`UPDATE tags SET sort_order = ? WHERE id = ?`).run(sortOrder, Number(req.params.id));
  res.json(db.prepare(`SELECT * FROM tags WHERE id = ?`).get(Number(req.params.id)));
});

/** DELETE /api/tags/:id - 删除标签 */
categoriesRouter.delete('/tags/:id', (req, res) => {
  const info = db.prepare(`DELETE FROM tags WHERE id = ?`).run(Number(req.params.id));
  res.status(info.changes > 0 ? 200 : 404).json(info.changes > 0 ? { ok: true } : { error: '标签不存在' });
});
