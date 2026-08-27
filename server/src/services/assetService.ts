/**
 * 素材服务：入库、去重、检索、标签管理、使用统计
 */
import { statSync, unlinkSync } from 'node:fs';
import { basename } from 'node:path';
import { db, nextAssetCode, UPLOAD_DIR } from '../lib/db.js';
import { probeVideo, makeThumbnail, sha256Of } from '../lib/video.js';
import { randomUUID } from 'node:crypto';

export interface AssetRow {
  id: number;
  code: string;
  filename: string;
  file_path: string;
  size: number;
  duration: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  sha256: string | null;
  thumbnail_path: string | null;
  golden3s: number;
  source: string;
  created_at: string;
  updated_at: string;
}

/** 素材入库结果 */
export interface RegisterResult {
  asset: AssetRow;
  /** 是否命中已有素材（内容重复，按 SHA-256 指纹判断） */
  duplicated: boolean;
}

/** 将已存在的视频文件登记入库（上传 / 扫描共用） */
export async function registerAsset(
  filePath: string,
  filename: string,
  source: 'upload' | 'folder',
): Promise<RegisterResult> {
  const absPath = filePath.startsWith('/') ? filePath : `${UPLOAD_DIR}/${filePath}`;

  // 1. 计算指纹，去重
  const sha256 = await sha256Of(absPath);
  const exist = db.prepare(`SELECT * FROM assets WHERE sha256 = ?`).get(sha256) as
    | AssetRow
    | undefined;
  if (exist) return { asset: exist, duplicated: true }; // 已存在：返回原素材并标记重复

  // 2. 读取元数据
  const meta = await probeVideo(absPath);
  const size = statSync(absPath).size;

  // 3. 生成缩略图（失败不阻塞入库）
  let thumb: string | null = null;
  try {
    thumb = await makeThumbnail(absPath, randomUUID());
  } catch {
    thumb = null;
  }

  // 4. 入库
  const code = nextAssetCode();
  const info = db
    .prepare(
      `INSERT INTO assets (code, filename, file_path, size, duration, width, height, fps, sha256, thumbnail_path, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(code, filename, absPath, size, meta.duration, meta.width, meta.height, meta.fps, sha256, thumb, source);
  const asset = db.prepare(`SELECT * FROM assets WHERE id = ?`).get(info.lastInsertRowid) as unknown as AssetRow;
  return { asset, duplicated: false };
}

export interface AssetFilters {
  search?: string;      // 编号/文件名/标签 模糊搜索
  tagIds?: number[];    // 标签筛选（多选，命中任一）
  golden3sOnly?: boolean;
  /** 素材状态：new 待标注 / organized 已整理 / used 已使用（互斥，优先级 used > organized > new） */
  status?: 'new' | 'organized' | 'used';
  page?: number;
  pageSize?: number;
}

/** 查询素材列表（含标签与使用次数统计），支持搜索与筛选 */
export function listAssets(filters: AssetFilters): {
  items: Array<AssetRow & { tags: unknown[]; usageCount: number }>;
  total: number;
} {
  const { search, tagIds = [], golden3sOnly, status, page = 1, pageSize = 60 } = filters;
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (search?.trim()) {
    where.push(`(
      a.code LIKE ? OR a.filename LIKE ? OR a.id IN (
        SELECT at.asset_id FROM asset_tags at
        JOIN tags t ON t.id = at.tag_id
        WHERE t.name LIKE ?
      )
    )`);
    const like = `%${search.trim()}%`;
    params.push(like, like, like);
  }
  if (golden3sOnly) where.push(`a.golden3s = 1`);
  if (tagIds.length > 0) {
    where.push(`a.id IN (
      SELECT at.asset_id FROM asset_tags at WHERE at.tag_id IN (${tagIds.map(() => '?').join(',')})
    )`);
    params.push(...tagIds);
  }
  // 状态筛选：used（被引用过）> organized（已打标/黄金3秒）> new（待标注）
  if (status === 'used') {
    where.push(`EXISTS (SELECT 1 FROM production_assets pa WHERE pa.asset_id = a.id)`);
  } else if (status === 'organized') {
    where.push(`NOT EXISTS (SELECT 1 FROM production_assets pa WHERE pa.asset_id = a.id)
      AND (a.golden3s = 1 OR EXISTS (SELECT 1 FROM asset_tags at WHERE at.asset_id = a.id))`);
  } else if (status === 'new') {
    where.push(`NOT EXISTS (SELECT 1 FROM production_assets pa WHERE pa.asset_id = a.id)
      AND a.golden3s = 0
      AND NOT EXISTS (SELECT 1 FROM asset_tags at WHERE at.asset_id = a.id)`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const total = (
    db.prepare(`SELECT COUNT(*) AS n FROM assets a ${whereSql}`).get(...params) as { n: number }
  ).n;

  const items = db
    .prepare(
      `SELECT a.*,
        (SELECT COUNT(*) FROM production_assets pa WHERE pa.asset_id = a.id) AS usageCount
       FROM assets a
       ${whereSql}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, (page - 1) * pageSize) as unknown as Array<
    AssetRow & { usageCount: number }
  >;

  // 批量加载每个素材的标签
  const tagMap = new Map<number, unknown[]>();
  if (items.length > 0) {
    const rows = db
      .prepare(
        `SELECT at.asset_id, t.id, t.name, t.color, c.id AS category_id, c.name AS category_name
         FROM asset_tags at
         JOIN tags t ON t.id = at.tag_id
         JOIN categories c ON c.id = t.category_id
         WHERE at.asset_id IN (${items.map(() => '?').join(',')})
         ORDER BY c.sort_order, t.sort_order`,
      )
      .all(...items.map((i) => i.id)) as Array<{
      asset_id: number;
      id: number;
      name: string;
      color: string;
      category_id: number;
      category_name: string;
    }>;
    for (const r of rows) {
      if (!tagMap.has(r.asset_id)) tagMap.set(r.asset_id, []);
      tagMap.get(r.asset_id)!.push({
        id: r.id,
        name: r.name,
        color: r.color,
        category: { id: r.category_id, name: r.category_name },
      });
    }
  }
  return {
    items: items.map((a) => ({ ...a, tags: tagMap.get(a.id) ?? [] })),
    total,
  };
}

/** 素材详情：基本信息 + 标签 + 使用次数 + 使用记录 */
export function getAssetDetail(id: number) {
  const asset = db.prepare(`SELECT * FROM assets WHERE id = ?`).get(id) as AssetRow | undefined;
  if (!asset) return null;

  const tags = db
    .prepare(
      `SELECT t.id, t.name, t.color, c.id AS category_id, c.name AS category_name
       FROM asset_tags at
       JOIN tags t ON t.id = at.tag_id
       JOIN categories c ON c.id = t.category_id
       WHERE at.asset_id = ?
       ORDER BY c.sort_order, t.sort_order`,
    )
    .all(id);

  const usageCount = (
    db.prepare(`SELECT COUNT(*) AS n FROM production_assets WHERE asset_id = ?`).get(id) as {
      n: number;
    }
  ).n;

  const usageRecords = db
    .prepare(
      `SELECT pa.id, pa.note, pa.created_at, p.id AS production_id, p.code AS production_code, p.title AS production_title
       FROM production_assets pa
       JOIN productions p ON p.id = pa.production_id
       WHERE pa.asset_id = ?
       ORDER BY pa.created_at DESC`,
    )
    .all(id);

  return { ...asset, tags, usageCount, usageRecords };
}

/** 更新素材：标签、黄金3秒标记 */
export function updateAsset(id: number, patch: { tagIds?: number[]; golden3s?: boolean }) {
  if (patch.golden3s !== undefined) {
    db.prepare(`UPDATE assets SET golden3s = ?, updated_at = datetime('now') WHERE id = ?`).run(
      patch.golden3s ? 1 : 0,
      id,
    );
  }
  if (patch.tagIds !== undefined) {
    db.prepare(`DELETE FROM asset_tags WHERE asset_id = ?`).run(id);
    const insert = db.prepare(`INSERT OR IGNORE INTO asset_tags (asset_id, tag_id) VALUES (?, ?)`);
    for (const tagId of [...new Set(patch.tagIds)]) insert.run(id, tagId);
  }
  return getAssetDetail(id);
}

/** 删除素材（含磁盘文件与缩略图） */
export function deleteAsset(id: number): boolean {
  const asset = db.prepare(`SELECT * FROM assets WHERE id = ?`).get(id) as AssetRow | undefined;
  if (!asset) return false;
  db.prepare(`DELETE FROM assets WHERE id = ?`).run(id);
  try {
    unlinkSync(asset.file_path);
  } catch {
    /* 文件可能已移动，忽略 */
  }
  if (asset.thumbnail_path) {
    try {
      unlinkSync(asset.thumbnail_path);
    } catch {
      /* 忽略 */
    }
  }
  return true;
}

/** 批量设置素材标签（整体替换：assetTags = tagIds） */
export function batchSetTags(assetIds: number[], tagIds: number[]): number {
  const ids = [...new Set(assetIds)];
  const del = db.prepare(`DELETE FROM asset_tags WHERE asset_id = ?`);
  const insert = db.prepare(`INSERT OR IGNORE INTO asset_tags (asset_id, tag_id) VALUES (?, ?)`);
  for (const id of ids) {
    del.run(id);
    for (const tagId of [...new Set(tagIds)]) insert.run(id, tagId);
  }
  return ids.length;
}

/** 批量设置黄金3秒标记 */
export function batchSetGolden3s(assetIds: number[], golden3s: boolean): number {
  const ids = [...new Set(assetIds)];
  const stmt = db.prepare(`UPDATE assets SET golden3s = ?, updated_at = datetime('now') WHERE id = ?`);
  for (const id of ids) stmt.run(golden3s ? 1 : 0, id);
  return ids.length;
}

/** 批量删除素材（返回实际删除数量） */
export function batchDeleteAssets(assetIds: number[]): number {
  let removed = 0;
  for (const id of [...new Set(assetIds)]) {
    if (deleteAsset(id)) removed++;
  }
  return removed;
}

/** 校验素材文件是否为受支持的视频扩展名 */
export function isVideoFile(filename: string): boolean {
  return /\.(mp4|mov|mkv|avi|webm|m4v|mts|m2ts|ts|flv|wmv|3gp)$/i.test(filename);
}

export { basename };
