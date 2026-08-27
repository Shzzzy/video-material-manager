/**
 * 身份路由：加入工作台、当前成员、邀请码管理、成员管理、SSE 实时事件
 */
import { Router, type Request, type Response } from 'express';
import {
  joinWorkspace,
  memberByToken,
  touchMember,
  createInvite,
  revokeInvite,
  restoreInvite,
  banMember,
  listInvites,
  listMembers,
  type Member,
} from '../services/authService.js';
import { addListener, removeListener } from '../services/realtimeService.js';

export const authRouter = Router();

/** 请求中携带的成员（由中间件注入） */
export interface AuthedRequest extends Request {
  member?: Member;
}

/** 管理员校验中间件 */
export function requireAdmin(req: Request, res: Response, next: () => void): void {
  const member = (req as AuthedRequest).member;
  if (!member || member.is_admin !== 1) {
    res.status(403).json({ error: '需要管理员权限' });
    return;
  }
  next();
}

// ---- 加入工作台 ----
/** POST /api/auth/join - 邀请码 + 昵称 加入 */
authRouter.post('/join', (req, res) => {
  const { code, nickname } = (req.body ?? {}) as { code?: string; nickname?: string };
  try {
    const member = joinWorkspace(code ?? '', nickname ?? '');
    res.json({
      token: member.token,
      nickname: member.nickname,
      isAdmin: member.is_admin === 1,
    });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : '加入失败' });
  }
});

// ---- 当前成员 ----
/** GET /api/auth/me - 校验 token 并返回当前成员（前端启动时调用） */
authRouter.get('/me', (req, res) => {
  const member = (req as AuthedRequest).member;
  if (!member) {
    res.status(401).json({ error: '未加入工作台' });
    return;
  }
  touchMember(member.id);
  res.json({
    id: member.id,
    nickname: member.nickname,
    isAdmin: member.is_admin === 1,
  });
});

// ---- 实时事件流（SSE） ----
/** GET /api/auth/events - 订阅变更广播（需登录） */
authRouter.get('/events', (req, res) => {
  const member = (req as AuthedRequest).member;
  if (!member) {
    res.status(401).json({ error: '未加入工作台' });
    return;
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`event: hello\ndata: ${JSON.stringify({ member: member.nickname })}\n\n`);

  const listener = { res, member };
  addListener(listener);
  req.on('close', () => removeListener(listener));
});

// ---- 邀请码管理（管理员） ----
/** GET /api/auth/invites */
authRouter.get('/invites', requireAdmin, (_req, res) => {
  res.json(listInvites());
});

/** POST /api/auth/invites - 生成邀请码 */
authRouter.post('/invites', requireAdmin, (req, res) => {
  const member = (req as AuthedRequest).member!;
  const { note } = (req.body ?? {}) as { note?: string };
  res.status(201).json(createInvite(member, note));
});

/** PATCH /api/auth/invites/:id - 拉黑/恢复 */
authRouter.patch('/invites/:id', requireAdmin, (req, res) => {
  const { revoked } = (req.body ?? {}) as { revoked?: boolean };
  const id = Number(req.params.id);
  if (revoked) revokeInvite(id);
  else restoreInvite(id);
  res.json({ ok: true });
});

// ---- 成员管理（管理员） ----
/** GET /api/auth/members */
authRouter.get('/members', requireAdmin, (_req, res) => {
  res.json(listMembers());
});

/** POST /api/auth/members/:id/ban - 踢出成员 */
authRouter.post('/members/:id/ban', requireAdmin, (req, res) => {
  banMember(Number(req.params.id));
  res.json({ ok: true });
});
