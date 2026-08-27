/**
 * 身份与成员服务：邀请码 + 昵称的无账户体系
 * - 首次启动生成管理员激活码（一次性），第一个使用者成为管理员
 * - 管理员可生成成员邀请码、拉黑邀请码（连带踢出相关成员）
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { db, DATA_DIR } from '../lib/db.js';

export interface Member {
  id: number;
  nickname: string;
  token: string;
  is_admin: number;
  invite_id: number | null;
  banned: number;
  first_seen: string;
  last_seen: string;
}

export interface Invite {
  id: number;
  code: string;
  note: string | null;
  created_by: number | null;
  revoked: number;
  used_count: number;
  created_at: string;
}

/** 管理员激活码（一次性）：仅当数据库没有任何成员时有效 */
const BOOTSTRAP_FILE = join(DATA_DIR, 'admin-bootstrap.key');

/** 当前激活码（模块内共享，joinWorkspace 校验用） */
let activeBootstrapCode = '';

/** 首次启动：生成并打印管理员激活码（持久化到数据目录，重启不变） */
export function bootstrapAdminCode(): string {
  if (existsSync(BOOTSTRAP_FILE)) {
    activeBootstrapCode = readFileSync(BOOTSTRAP_FILE, 'utf8').trim();
  } else {
    activeBootstrapCode = `ADMIN-${randomBytes(4).toString('hex').toUpperCase()}`;
    writeFileSync(BOOTSTRAP_FILE, activeBootstrapCode, 'utf8');
  }
  const code = activeBootstrapCode;
  // 仅当系统还没有任何成员时才提示激活码（已有成员时无需再激活）
  const memberCount = (db.prepare(`SELECT COUNT(*) AS n FROM members`).get() as { n: number }).n;
  if (memberCount === 0) {
    console.log(`\n========================================`);
    console.log(`  首次启动 · 管理员激活码（一次性）`);
    console.log(`  ${code}`);
    console.log(`  在「加入工作台」页面输入该码成为核心管理员`);
    console.log(`========================================\n`);
  }
  return code;
}

/** 校验邀请码/激活码并创建成员（注册即加入） */
export function joinWorkspace(code: string, nickname: string): Member {
  const trimmedCode = code.trim().toUpperCase();
  const nick = nickname.trim().slice(0, 24);
  if (!trimmedCode || !nick) throw new Error('邀请码与昵称不能为空');

  const memberCount = (db.prepare(`SELECT COUNT(*) AS n FROM members`).get() as { n: number }).n;

  // 管理员激活码：仅当系统还没有任何成员
  if (memberCount === 0) {
    if (!activeBootstrapCode || trimmedCode !== activeBootstrapCode) {
      throw new Error('管理员激活码不正确，请检查启动日志中的一次性激活码');
    }
    const token = randomUUID();
    const info = db
      .prepare(`INSERT INTO members (nickname, token, is_admin) VALUES (?, ?, 1)`)
      .run(nick, token);
    console.log(`[auth] 管理员已创建：${nick}`);
    return db.prepare(`SELECT * FROM members WHERE id = ?`).get(info.lastInsertRowid) as unknown as Member;
  }

  // 普通邀请码
  const invite = db.prepare(`SELECT * FROM invites WHERE code = ?`).get(trimmedCode) as unknown as
    | Invite
    | undefined;
  if (!invite) throw new Error('邀请码不存在');
  if (invite.revoked === 1) throw new Error('该邀请码已被拉黑，请联系管理员');
  if (invite.code.startsWith('ADMIN-')) throw new Error('管理员激活码仅限首次使用');

  const token = randomUUID();
  const info = db
    .prepare(`INSERT INTO members (nickname, token, invite_id) VALUES (?, ?, ?)`)
    .run(nick, token, invite.id);
  db.prepare(`UPDATE invites SET used_count = used_count + 1 WHERE id = ?`).run(invite.id);
  return db.prepare(`SELECT * FROM members WHERE id = ?`).get(info.lastInsertRowid) as unknown as Member;
}

/** 按 token 取成员（不存在/被拉黑返回 null） */
export function memberByToken(token: string): Member | null {
  if (!token) return null;
  const m = db.prepare(`SELECT * FROM members WHERE token = ?`).get(token) as
    | (Record<string, unknown> & Member)
    | undefined;
  if (!m || m.banned === 1) return null;
  return m;
}

/** 更新最后活跃时间（轻量节流：仅当超过 5 分钟） */
export function touchMember(id: number): void {
  db.prepare(
    `UPDATE members SET last_seen = datetime('now') WHERE id = ? AND last_seen < datetime('now', '-5 minutes')`,
  ).run(id);
}

/** 管理员：生成成员邀请码 */
export function createInvite(admin: Member, note?: string): Invite {
  const code = `CAW-${randomBytes(3).toString('hex').toUpperCase()}`;
  const info = db
    .prepare(`INSERT INTO invites (code, note, created_by) VALUES (?, ?, ?)`)
    .run(code, note?.trim().slice(0, 60) || null, admin.id);
  return db.prepare(`SELECT * FROM invites WHERE id = ?`).get(info.lastInsertRowid) as unknown as Invite;
}

/** 管理员：拉黑邀请码（连带禁用通过它加入的成员） */
export function revokeInvite(inviteId: number): void {
  db.prepare(`UPDATE invites SET revoked = 1 WHERE id = ?`).run(inviteId);
  // 通过该邀请码加入的成员一并禁用
  db.prepare(`UPDATE members SET banned = 1 WHERE invite_id = ?`).run(inviteId);
}

/** 管理员：恢复邀请码与成员 */
export function restoreInvite(inviteId: number): void {
  db.prepare(`UPDATE invites SET revoked = 0 WHERE id = ?`).run(inviteId);
  db.prepare(`UPDATE members SET banned = 0 WHERE invite_id = ?`).run(inviteId);
}

/** 管理员：强制踢出成员（解除 token） */
export function banMember(memberId: number): void {
  db.prepare(`UPDATE members SET banned = 1 WHERE id = ?`).run(memberId);
}

/** 邀请码列表（含使用情况） */
export function listInvites(): Invite[] {
  return db.prepare(`SELECT * FROM invites ORDER BY created_at DESC`).all() as unknown as Invite[];
}

/** 成员列表（含最近活跃） */
export function listMembers(): Member[] {
  return db
    .prepare(`SELECT * FROM members ORDER BY is_admin DESC, last_seen DESC`)
    .all() as unknown as Member[];
}
