/**
 * 账户服务：手机号 + 密码的注册登录体系
 * - 首个用户通过【初始化管理员码】注册成为核心管理员（仅一个，不可增减）
 * - 普通用户开放注册；登录带失败限流
 * - 密码使用 node:crypto scrypt 哈希存储
 */
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { db, DATA_DIR } from '../lib/db.js';

export interface User {
  id: number;
  phone: string;
  password_hash: string;
  nickname: string;
  role: string;
  status: number;
  token: string | null;
  login_count: number;
  last_login_at: string | null;
  created_at: string;
}

/** 初始化管理员码持久化文件 */
const INIT_FILE = join(DATA_DIR, 'admin-init.key');

/** 当前初始化码（模块内共享） */
let activeInitCode = '';

/** 首次启动：生成/读取初始化管理员码 */
export function bootstrapAdminCode(): string {
  if (existsSync(INIT_FILE)) {
    activeInitCode = readFileSync(INIT_FILE, 'utf8').trim();
  } else {
    activeInitCode = `ADMIN-${randomBytes(4).toString('hex').toUpperCase()}`;
    writeFileSync(INIT_FILE, activeInitCode, 'utf8');
  }
  const hasUser = (db.prepare(`SELECT COUNT(*) AS n FROM users`).get() as { n: number }).n > 0;
  if (!hasUser) {
    console.log(`\n========================================`);
    console.log(`  首次启动 · 初始化管理员码（一次性）`);
    console.log(`  ${activeInitCode}`);
    console.log(`  注册第一个账号时输入该码，成为核心管理员`);
    console.log(`========================================\n`);
  }
  return activeInitCode;
}

/** scrypt 密码哈希 */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

/** 校验密码 */
function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/** 注册（首个用户需输入初始化管理员码） */
export function registerUser(
  phone: string,
  password: string,
  nickname: string,
  initCode?: string,
): User {
  const p = phone.trim();
  const nick = nickname.trim().slice(0, 24);
  if (!/^1\d{10}$/.test(p)) throw new Error('请输入正确的 11 位手机号');
  if (password.length < 6 || password.length > 32) throw new Error('密码长度需为 6-32 位');
  if (!nick) throw new Error('昵称不能为空');

  const hasUser = (db.prepare(`SELECT COUNT(*) AS n FROM users`).get() as { n: number }).n > 0;
  const isFirst = !hasUser;

  // 首个用户必须使用初始化管理员码
  if (isFirst) {
    const code = (initCode ?? '').trim().toUpperCase();
    if (!activeInitCode || code !== activeInitCode) {
      throw new Error('系统尚无用户，请使用启动日志中的初始化管理员码注册第一个账号');
    }
  }

  try {
    const info = db
      .prepare(`INSERT INTO users (phone, password_hash, nickname, role) VALUES (?, ?, ?, ?)`)
      .run(p, hashPassword(password), nick, isFirst ? 'admin' : 'user');
    return db.prepare(`SELECT * FROM users WHERE id = ?`).get(info.lastInsertRowid) as unknown as User;
  } catch (e) {
    if (e instanceof Error && e.message.includes('UNIQUE')) throw new Error('该手机号已注册');
    throw e;
  }
}

/** 登录失败限流：手机号 → { 次数, 锁定截止 } */
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 10;

/** 登录（成功签发新 token） */
export function loginUser(phone: string, password: string): User {
  const p = phone.trim();
  const attempt = loginAttempts.get(p);

  // 锁定检查：锁定未过期则拒绝
  if (attempt && attempt.lockedUntil > Date.now()) {
    const mins = Math.ceil((attempt.lockedUntil - Date.now()) / 60000);
    throw new Error(`登录失败次数过多，请 ${mins} 分钟后再试`);
  }
  // 锁定已过期：清除计数，重新开始
  if (attempt && attempt.lockedUntil > 0 && attempt.lockedUntil <= Date.now()) {
    loginAttempts.delete(p);
  }

  const user = db.prepare(`SELECT * FROM users WHERE phone = ?`).get(p) as
    | (Record<string, unknown> & User)
    | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    const cur = loginAttempts.get(p) ?? { count: 0, lockedUntil: 0 };
    cur.count += 1;
    if (cur.count >= MAX_ATTEMPTS) {
      cur.lockedUntil = Date.now() + LOCK_MINUTES * 60_000;
      cur.count = 0;
    }
    loginAttempts.set(p, cur);
    throw new Error(
      cur.lockedUntil > Date.now()
        ? `密码错误次数过多，账号已锁定 ${LOCK_MINUTES} 分钟`
        : `手机号或密码错误（还可尝试 ${MAX_ATTEMPTS - cur.count} 次）`,
    );
  }
  if (user.status !== 1) throw new Error('该账号已被禁用，请联系管理员');
  loginAttempts.delete(p);

  // 签发会话 token
  const token = randomUUID();
  db.prepare(
    `UPDATE users SET token = ?, login_count = login_count + 1, last_login_at = datetime('now') WHERE id = ?`,
  ).run(token, user.id);
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id) as unknown as User;
}

/** 按 token 取用户（不存在/被禁用返回 null） */
export function userByToken(token: string): User | null {
  if (!token) return null;
  const u = db.prepare(`SELECT * FROM users WHERE token = ?`).get(token) as
    | (Record<string, unknown> & User)
    | undefined;
  if (!u || u.status !== 1) return null;
  return u;
}

/** 退出登录（清 token） */
export function logoutUser(id: number): void {
  db.prepare(`UPDATE users SET token = NULL WHERE id = ?`).run(id);
}

/** 用户列表（不含密码哈希） */
export function listUsers(): Array<Omit<User, 'password_hash'>> {
  return db
    .prepare(
      `SELECT id, phone, nickname, role, status, login_count, last_login_at, created_at FROM users ORDER BY id`,
    )
    .all() as unknown as Array<Omit<User, 'password_hash'>>;
}

/** 管理员：禁用/启用账号（核心管理员不可禁用） */
export function setUserStatus(userId: number, status: number): void {
  const target = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as
    | (Record<string, unknown> & User)
    | undefined;
  if (!target) throw new Error('用户不存在');
  if (target.role === 'admin') throw new Error('不能禁用核心管理员账号');
  db.prepare(
    `UPDATE users SET status = ?, token = CASE WHEN ? = 0 THEN NULL ELSE token END WHERE id = ?`,
  ).run(status, status, userId);
}

/** 管理员：重置用户密码 */
export function resetUserPassword(userId: number, newPassword: string): void {
  if (newPassword.length < 6 || newPassword.length > 32) {
    throw new Error('新密码长度需为 6-32 位');
  }
  const target = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as
    | (Record<string, unknown> & User)
    | undefined;
  if (!target) throw new Error('用户不存在');
  db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(
    hashPassword(newPassword),
    userId,
  );
}

/** 公共用户信息（脱敏） */
export function publicUser(u: User): {
  id: number;
  phone: string;
  nickname: string;
  role: string;
  isAdmin: boolean;
} {
  return {
    id: u.id,
    phone: u.phone,
    nickname: u.nickname,
    role: u.role,
    isAdmin: u.role === 'admin',
  };
}
