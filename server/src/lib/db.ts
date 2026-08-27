/**
 * 数据库层：使用 Node 内置 node:sqlite（零原生依赖）
 * 负责初始化 schema 与提供连接实例
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** 数据目录（数据库文件 + 上传文件 + 缩略图），位于 server/data/ */
export const DATA_DIR = join(__dirname, '..', '..', 'data');
export const UPLOAD_DIR = join(DATA_DIR, 'uploads');
export const THUMB_DIR = join(DATA_DIR, 'thumbs');

mkdirSync(UPLOAD_DIR, { recursive: true });
mkdirSync(THUMB_DIR, { recursive: true });

export const db = new DatabaseSync(join(DATA_DIR, 'assets.db'));

/** 初始化数据库表结构 */
export function initDb(): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- 分类维度（用户自定义，如：拍摄人员、场景、景别、剪辑人员）
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 标签值（隶属于某个分类维度）
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#5B7C6B',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (category_id, name)
    );

    -- 素材
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,                    -- 素材编号，如 AS-0001
      filename TEXT NOT NULL,                       -- 原始文件名
      file_path TEXT NOT NULL,                      -- 存储路径
      size INTEGER NOT NULL DEFAULT 0,              -- 文件大小（字节）
      duration REAL,                                -- 时长（秒）
      width INTEGER,                                -- 分辨率宽
      height INTEGER,                               -- 分辨率高
      fps REAL,                                     -- 帧率
      sha256 TEXT UNIQUE,                           -- 文件指纹（去重）
      thumbnail_path TEXT,                          -- 缩略图路径
      source TEXT NOT NULL DEFAULT 'upload',        -- 来源：upload（上传）/ folder（文件夹扫描）
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 素材-标签 多对多
    CREATE TABLE IF NOT EXISTS asset_tags (
      asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (asset_id, tag_id)
    );

    -- 成片
    CREATE TABLE IF NOT EXISTS productions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,                    -- 成片编号，如 PC-0001
      title TEXT NOT NULL,
      cover_path TEXT,                              -- 封面路径
      duration REAL,                                -- 时长（秒）
      description TEXT,
      publish_status TEXT NOT NULL DEFAULT 'draft', -- 发布状态：draft / published
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 成片-素材 关联（每次引用生成一条记录，用于统计使用次数）
    CREATE TABLE IF NOT EXISTS production_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      production_id INTEGER NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
      asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      note TEXT,                                    -- 使用说明（如：开场 0-8s）
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 成员（无账户：邀请码 + 昵称进入）
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL,                       -- 昵称（可重复，设备 token 区分）
      token TEXT NOT NULL UNIQUE,                   -- 设备 token（随机 uuid，浏览器保存）
      is_admin INTEGER NOT NULL DEFAULT 0,          -- 是否管理员
      invite_id INTEGER,                            -- 通过哪个邀请码加入（拉黑用）
      banned INTEGER NOT NULL DEFAULT 0,            -- 是否被拉黑
      first_seen TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 邀请码
    CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,                    -- 邀请码（如 CAW-XXXX）
      note TEXT,                                    -- 备注（发给谁）
      created_by INTEGER,                           -- 创建人 member_id
      revoked INTEGER NOT NULL DEFAULT 0,           -- 是否已拉黑
      used_count INTEGER NOT NULL DEFAULT 0,        -- 已使用次数
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 迁移：历史版本的表补充操作人字段（created_by）
  migrateColumn('assets', 'created_by', 'INTEGER');
  migrateColumn('productions', 'created_by', 'INTEGER');
  migrateColumn('production_assets', 'created_by', 'INTEGER');

  // 迁移：移除历史版本的 golden3s 字段（黄金3秒功能已下线）
  const cols = db.prepare(`PRAGMA table_info(assets)`).all() as Array<{ name: string }>;
  if (cols.some((c) => c.name === 'golden3s')) {
    db.exec(`ALTER TABLE assets DROP COLUMN golden3s`);
    console.log('[db] 已迁移：移除 assets.golden3s 字段');
  }
}

/** 迁移辅助：为表补列（已存在则跳过） */
function migrateColumn(table: string, column: string, type: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    console.log(`[db] 已迁移：${table} 增加 ${column} 列`);
  }
}

/** 生成素材编号：AS-0001 递增（基于最大 id，删除后不偏移） */
export function nextAssetCode(): string {
  const row = db.prepare(`SELECT COALESCE(MAX(id), 0) + 1 AS n FROM assets`).get() as { n: number };
  return `AS-${String(row.n).padStart(4, '0')}`;
}

/** 生成成片编号：PC-0001 递增（基于最大 id，删除后不偏移） */
export function nextProductionCode(): string {
  const row = db.prepare(`SELECT COALESCE(MAX(id), 0) + 1 AS n FROM productions`).get() as {
    n: number;
  };
  return `PC-${String(row.n).padStart(4, '0')}`;
}
