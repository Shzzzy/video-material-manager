/** 管理面板：用户管理（禁用/启用、重置密码、登录记录）· 仅核心管理员 */
import { useCallback, useEffect, useState } from 'react';
import { Ban, Check, KeyRound, RefreshCw, RotateCcw, Users } from 'lucide-react';
import { api, formatDate } from '../api';
import { useStore } from '../store';
import { Modal } from './Modal';

interface AdminUser {
  id: number;
  phone: string;
  nickname: string;
  role: string;
  status: number;
  login_count: number;
  last_login_at: string | null;
  created_at: string;
}

/** 手机号脱敏：138****0001 */
function maskPhone(phone: string): string {
  return phone.length === 11 ? `${phone.slice(0, 3)}****${phone.slice(7)}` : phone;
}

export function AdminPanel() {
  const { adminPanelOpen, setAdminPanelOpen, member } = useStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      setUsers(await api.listUsers());
    } catch {
      /* 权限失效时静默 */
    }
  }, []);

  useEffect(() => {
    if (adminPanelOpen) void load();
  }, [adminPanelOpen, load]);

  const toggleStatus = async (u: AdminUser) => {
    const action = u.status === 1 ? '禁用' : '启用';
    if (!confirm(`确认${action}「${u.nickname}」？${u.status === 1 ? '其登录会话将立即失效。' : ''}`)) return;
    await api.setUserStatus(u.id, u.status === 1 ? 0 : 1);
    setMsg(`${action}成功`);
    setTimeout(() => setMsg(''), 2000);
    await load();
  };

  const doReset = async () => {
    if (!resetTarget) return;
    if (newPassword.length < 6) {
      setMsg('新密码至少 6 位');
      return;
    }
    await api.resetPassword(resetTarget.id, newPassword);
    setResetTarget(null);
    setNewPassword('');
    setMsg(`已重置「${resetTarget.nickname}」的密码`);
    setTimeout(() => setMsg(''), 2500);
  };

  const admin = users.find((u) => u.role === 'admin');

  return (
    <>
      <Modal
        open={adminPanelOpen}
        onClose={() => setAdminPanelOpen(false)}
        title="用户管理"
        subtitle="管理团队成员账号 · 仅核心管理员可见"
        width={640}
      >
        <div className="p-5">
          {/* 管理员信息条 */}
          {admin && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-gold/40 bg-gold-soft/60 px-3.5 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-700 text-[12px] font-semibold text-cream-50">
                {admin.nickname.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[12.5px] font-medium text-ink-900">
                  {admin.nickname}
                  <span className="rounded bg-gold-soft px-1.5 py-px text-[10px] font-medium text-gold-ink">
                    核心管理员
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-ink-400">
                  {maskPhone(admin.phone)} · 登录 {admin.login_count} 次
                  {admin.last_login_at ? ` · 最近 ${formatDate(admin.last_login_at)}` : ''}
                </p>
              </div>
            </div>
          )}

          {/* 用户列表 */}
          <div className="space-y-1.5">
            {users
              .filter((u) => u.role !== 'admin')
              .map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-xl border border-ink-900/8 bg-cream-200/40 px-3 py-2.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-700 text-[12px] font-semibold text-cream-50">
                    {u.nickname.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[12.5px] font-medium text-ink-900">{u.nickname}</span>
                      {u.status === 0 && (
                        <span className="rounded bg-alert-soft px-1.5 py-px text-[10px] font-medium text-alert">
                          已禁用
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-400">
                      {maskPhone(u.phone)} · 注册 {formatDate(u.created_at)}
                      {u.last_login_at ? ` · 登录 ${u.login_count} 次，最近 ${formatDate(u.last_login_at)}` : ' · 尚未登录'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setResetTarget(u);
                      setNewPassword('');
                    }}
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11.5px] text-ink-400 transition-colors hover:bg-ink-900/5 hover:text-ink-700"
                    title="重置密码"
                  >
                    <KeyRound size={12} />
                    重置密码
                  </button>
                  <button
                    onClick={() => void toggleStatus(u)}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11.5px] transition-colors ${
                      u.status === 1
                        ? 'text-alert hover:bg-alert-soft'
                        : 'text-forest-600 hover:bg-forest-100'
                    }`}
                  >
                    {u.status === 1 ? <Ban size={12} /> : <RotateCcw size={12} />}
                    {u.status === 1 ? '禁用' : '启用'}
                  </button>
                </div>
              ))}
            {users.filter((u) => u.role !== 'admin').length === 0 && (
              <p className="py-8 text-center text-[12px] text-ink-400">
                还没有普通用户。成员通过注册页的手机号 + 密码注册后出现在这里。
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] text-ink-300">
              <Users size={11} />
              共 {users.length} 个账号 · 核心管理员固定 1 个，不可禁用
            </p>
            {msg && <p className="text-[12px] font-medium text-forest-600">{msg}</p>}
            <button
              onClick={() => void load()}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] text-ink-400 hover:bg-ink-900/5"
            >
              <RefreshCw size={11} /> 刷新
            </button>
          </div>
        </div>
      </Modal>

      {/* 重置密码 */}
      <Modal
        open={resetTarget !== null}
        onClose={() => setResetTarget(null)}
        title={`重置「${resetTarget?.nickname ?? ''}」的密码`}
        subtitle="重置后该用户需用新密码登录"
        width={400}
      >
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-ink-700">新密码（6-32 位）</label>
            <input
              autoFocus
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void doReset()}
              placeholder="输入新密码"
              className="h-10 w-full rounded-lg border border-ink-900/8 bg-cream-200/60 px-3 text-[13px] outline-none focus:border-forest-500/50 focus:ring-2 focus:ring-forest-500/15"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setResetTarget(null)}
              className="rounded-lg px-4 py-2 text-[12.5px] text-ink-400 hover:bg-ink-900/5"
            >
              取消
            </button>
            <button
              onClick={() => void doReset()}
              disabled={newPassword.length < 6}
              className="flex items-center gap-1.5 rounded-lg bg-forest-700 px-5 py-2 text-[12.5px] font-medium text-cream-50 shadow-card transition-all hover:bg-forest-600 active:scale-[0.98] disabled:opacity-40"
            >
              <Check size={13} />
              确认重置
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
