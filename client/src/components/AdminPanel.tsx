/** 管理面板：邀请码管理与成员管理（仅核心管理员可见） */
import { useCallback, useEffect, useState } from 'react';
import { Ban, Check, Copy, KeyRound, Plus, RefreshCw, Users } from 'lucide-react';
import { api, formatDate } from '../api';
import { useStore } from '../store';
import { Modal } from './Modal';

interface Invite {
  id: number;
  code: string;
  note: string | null;
  revoked: number;
  used_count: number;
  created_at: string;
}

interface TeamMember {
  id: number;
  nickname: string;
  is_admin: number;
  banned: number;
  first_seen: string;
  last_seen: string;
}

export function AdminPanel() {
  const { adminPanelOpen, setAdminPanelOpen, refreshMember } = useStore();
  const [tab, setTab] = useState<'invites' | 'members'>('invites');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [inv, mem] = await Promise.all([api.listInvites(), api.listMembers()]);
      setInvites(inv);
      setMembers(mem);
    } catch {
      /* 权限失效时静默 */
    }
  }, []);

  useEffect(() => {
    if (adminPanelOpen) void load();
  }, [adminPanelOpen, load]);

  const createInvite = async () => {
    const inv = await api.createInvite(note || undefined);
    setNote('');
    await load();
    void copyCode(inv.code);
  };

  const copyCode = async (code: string, id?: number) => {
    try {
      await navigator.clipboard.writeText(code);
      if (id) {
        setCopied(id);
        setTimeout(() => setCopied(null), 1500);
      }
    } catch {
      /* 剪贴板不可用时忽略 */
    }
  };

  const toggleRevoke = async (inv: Invite) => {
    await api.revokeInvite(inv.id, inv.revoked === 0);
    await load();
  };

  const ban = async (id: number, nickname: string) => {
    if (!confirm(`确认将「${nickname}」移出工作台？其操作权限立即失效。`)) return;
    await api.banMember(id);
    await load();
  };

  return (
    <Modal
      open={adminPanelOpen}
      onClose={() => setAdminPanelOpen(false)}
      title="管理工作台"
      subtitle="邀请码与成员管理 · 仅核心管理员可见"
      width={620}
    >
      {/* Tab */}
      <div className="flex gap-1 border-b border-ink-900/6 px-5 pt-3 pb-3">
        <button
          onClick={() => setTab('invites')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all ${
            tab === 'invites' ? 'bg-forest-100 text-forest-800' : 'text-ink-400 hover:bg-ink-900/4'
          }`}
        >
          <KeyRound size={13} /> 邀请码
        </button>
        <button
          onClick={() => setTab('members')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all ${
            tab === 'members' ? 'bg-forest-100 text-forest-800' : 'text-ink-400 hover:bg-ink-900/4'
          }`}
        >
          <Users size={13} /> 成员
        </button>
        <button
          onClick={() => void load()}
          className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] text-ink-400 hover:bg-ink-900/4"
        >
          <RefreshCw size={11} /> 刷新
        </button>
      </div>

      <div className="min-h-[300px] p-5">
        {tab === 'invites' ? (
          <div className="space-y-3">
            {/* 生成邀请码 */}
            <div className="flex items-center gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="备注（发给谁，可选）"
                className="h-9 flex-1 rounded-lg border border-ink-900/8 bg-cream-200/60 px-3 text-[12.5px] outline-none focus:border-forest-500/50 focus:ring-2 focus:ring-forest-500/15"
              />
              <button
                onClick={() => void createInvite()}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-forest-700 px-4 text-[12.5px] font-medium text-cream-50 shadow-card transition-all hover:bg-forest-600 active:scale-[0.98]"
              >
                <Plus size={13} />
                生成邀请码
              </button>
            </div>

            {/* 邀请码列表 */}
            {invites.length === 0 ? (
              <p className="py-10 text-center text-[12px] text-ink-400">
                还没有邀请码，先生成一个发给团队成员
              </p>
            ) : (
              <div className="space-y-1.5">
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                      inv.revoked === 1 ? 'border-alert/30 bg-alert-soft/60 opacity-70' : 'border-ink-900/8 bg-cream-200/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12.5px] font-semibold text-forest-700">
                          {inv.code}
                        </span>
                        {inv.revoked === 1 ? (
                          <span className="rounded bg-alert-soft px-1.5 py-px text-[10px] font-medium text-alert">
                            已拉黑
                          </span>
                        ) : (
                          <span className="rounded bg-forest-100 px-1.5 py-px text-[10px] font-medium text-forest-700">
                            有效
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-ink-400">
                        {inv.note ? `${inv.note} · ` : ''}已用 {inv.used_count} 次 · {formatDate(inv.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => void copyCode(inv.code, inv.id)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11.5px] text-ink-400 transition-colors hover:bg-ink-900/5 hover:text-ink-700"
                      title="复制邀请码"
                    >
                      {copied === inv.id ? <Check size={12} className="text-forest-600" /> : <Copy size={12} />}
                      复制
                    </button>
                    <button
                      onClick={() => void toggleRevoke(inv)}
                      className={`rounded-lg px-2 py-1.5 text-[11.5px] transition-colors ${
                        inv.revoked === 1
                          ? 'text-forest-600 hover:bg-forest-100'
                          : 'text-alert hover:bg-alert-soft'
                      }`}
                    >
                      {inv.revoked === 1 ? '恢复' : '拉黑'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] leading-relaxed text-ink-300">
              拉黑邀请码后，通过该码加入的成员将立即失去访问权限；恢复后重新可用。
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {members.length === 0 ? (
              <p className="py-10 text-center text-[12px] text-ink-400">暂无成员</p>
            ) : (
              members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-ink-900/8 bg-cream-200/40 px-3 py-2.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-700 text-[12px] font-semibold text-cream-50">
                    {m.nickname.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[12.5px] font-medium text-ink-900">{m.nickname}</span>
                      {m.is_admin === 1 && (
                        <span className="rounded bg-gold-soft px-1.5 py-px text-[10px] font-medium text-gold-ink">
                          核心管理员
                        </span>
                      )}
                      {m.banned === 1 && (
                        <span className="rounded bg-alert-soft px-1.5 py-px text-[10px] font-medium text-alert">
                          已移出
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-400">
                      加入 {formatDate(m.first_seen)} · 最近活跃 {formatDate(m.last_seen)}
                    </p>
                  </div>
                  {m.is_admin !== 1 && m.banned === 0 && (
                    <button
                      onClick={() => void ban(m.id, m.nickname)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11.5px] text-alert transition-colors hover:bg-alert-soft"
                    >
                      <Ban size={12} />
                      移出
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
