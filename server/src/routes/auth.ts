/**
 * 账户路由：注册、登录、退出、用户管理（管理员）
 */
import { Router, type Request, type Response } from 'express';
import {
  registerUser,
  loginUser,
  userByToken,
  logoutUser,
  listUsers,
  setUserStatus,
  resetUserPassword,
  publicUser,
  type User,
} from '../services/authService.js';
import { addListener, removeListener } from '../services/realtimeService.js';

export const authRouter = Router();

/** 请求中携带的用户（由中间件注入） */
export interface AuthedRequest extends Request {
  user?: User;
}

/** 管理员校验中间件 */
export function requireAdmin(req: Request, res: Response, next: () => void): void {
  const user = (req as AuthedRequest).user;
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: '需要管理员权限' });
    return;
  }
  next();
}

// ---- 注册 ----
/** POST /api/auth/register - 注册（首个用户需初始化管理员码） */
authRouter.post('/register', (req, res) => {
  const { phone, password, nickname, initCode } = (req.body ?? {}) as {
    phone?: string;
    password?: string;
    nickname?: string;
    initCode?: string;
  };
  try {
    const user = registerUser(phone ?? '', password ?? '', nickname ?? '', initCode);
    res.status(201).json({ token: user.token, ...publicUser(user) });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : '注册失败' });
  }
});

// ---- 登录 ----
/** POST /api/auth/login - 登录（失败限流） */
authRouter.post('/login', (req, res) => {
  const { phone, password } = (req.body ?? {}) as { phone?: string; password?: string };
  try {
    const user = loginUser(phone ?? '', password ?? '');
    res.json({ token: user.token, ...publicUser(user) });
  } catch (e) {
    res.status(401).json({ error: e instanceof Error ? e.message : '登录失败' });
  }
});

// ---- 退出 ----
/** POST /api/auth/logout - 退出登录 */
authRouter.post('/logout', (req, res) => {
  const user = (req as AuthedRequest).user;
  if (user) logoutUser(user.id);
  res.json({ ok: true });
});

// ---- 当前用户 ----
/** GET /api/auth/me - 当前用户信息（前端启动时校验） */
authRouter.get('/me', (req, res) => {
  const user = (req as AuthedRequest).user;
  if (!user) {
    res.status(401).json({ error: '未登录' });
    return;
  }
  res.json(publicUser(user));
});

// ---- 实时事件流（SSE） ----
/** GET /api/auth/events - 订阅变更广播（需登录） */
authRouter.get('/events', (req, res) => {
  const user = (req as AuthedRequest).user;
  if (!user) {
    res.status(401).json({ error: '未登录' });
    return;
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`event: hello\ndata: ${JSON.stringify({ nickname: user.nickname })}\n\n`);

  const listener = { res, member: user as unknown as { nickname: string } };
  addListener(listener as never);
  req.on('close', () => removeListener(listener as never));
});

// ---- 用户管理（管理员） ----
/** GET /api/auth/users - 用户列表 */
authRouter.get('/users', requireAdmin, (_req, res) => {
  res.json(listUsers());
});

/** PATCH /api/auth/users/:id/status - 禁用/启用账号 */
authRouter.patch('/users/:id/status', requireAdmin, (req, res) => {
  const { status } = (req.body ?? {}) as { status?: number };
  try {
    setUserStatus(Number(req.params.id), status === 0 ? 0 : 1);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : '操作失败' });
  }
});

/** POST /api/auth/users/:id/reset-password - 重置密码 */
authRouter.post('/users/:id/reset-password', requireAdmin, (req, res) => {
  const { newPassword } = (req.body ?? {}) as { newPassword?: string };
  try {
    resetUserPassword(Number(req.params.id), newPassword ?? '');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : '重置失败' });
  }
});
