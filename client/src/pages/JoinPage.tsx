/** 加入工作台页面：邀请码 + 昵称（无账户体系） */
import { useState } from 'react';
import { ArrowRight, Film, KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { api, MEMBER_TOKEN_KEY } from '../api';
import { useStore } from '../store';

export function JoinPage() {
  const { refreshMember } = useStore();
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const join = async () => {
    if (!code.trim() || !nickname.trim() || joining) return;
    setJoining(true);
    setError('');
    try {
      const res = await api.joinWorkspace(code.trim(), nickname.trim());
      localStorage.setItem(MEMBER_TOKEN_KEY, res.token);
      await refreshMember();
    } catch (e) {
      setError(e instanceof Error ? e.message : '加入失败');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-cream-100 px-6">
      <div className="rise-in w-full max-w-md">
        {/* 品牌区 */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-700 text-cream-50 shadow-float">
            <Film size={24} />
          </div>
          <h1 className="mt-4 text-[20px] font-semibold text-ink-900">创意素材工作台</h1>
          <p className="mt-1 text-[12.5px] text-ink-400">
            让每一条素材都可查、可用、可追踪 · 团队协作无需注册
          </p>
        </div>

        {/* 加入卡片 */}
        <div className="rounded-2xl bg-cream-50 p-6 shadow-card hairline">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-ink-700">
                <KeyRound size={12} className="text-forest-600" />
                邀请码
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && void join()}
                placeholder="向管理员索取邀请码（如 CAW-XXXX）"
                className="h-10 w-full rounded-lg border border-ink-900/8 bg-cream-200/60 px-3 font-mono text-[13px] tracking-wide outline-none focus:border-forest-500/50 focus:ring-2 focus:ring-forest-500/15"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-ink-700">
                <UserRound size={12} className="text-forest-600" />
                你的昵称
              </label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void join()}
                placeholder="例如：阿伟"
                maxLength={24}
                className="h-10 w-full rounded-lg border border-ink-900/8 bg-cream-200/60 px-3 text-[13px] outline-none focus:border-forest-500/50 focus:ring-2 focus:ring-forest-500/15"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-alert-soft px-3 py-2 text-[12px] text-alert">{error}</p>
            )}

            <button
              onClick={() => void join()}
              disabled={!code.trim() || !nickname.trim() || joining}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-forest-700 text-[13px] font-medium text-cream-50 shadow-card transition-all hover:bg-forest-600 active:scale-[0.99] disabled:opacity-40"
            >
              {joining ? '加入中…' : '加入工作台'}
              {!joining && <ArrowRight size={14} />}
            </button>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-cream-200/50 p-3">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-forest-600" />
            <p className="text-[11px] leading-relaxed text-ink-400">
              无需注册账号。首次使用管理员激活码的人将成为核心管理员；
              成员通过管理员分发的邀请码加入。你的操作会以昵称留痕。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
