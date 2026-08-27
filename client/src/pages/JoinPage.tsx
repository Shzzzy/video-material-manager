/** 登录 / 注册页面：手机号 + 密码（首个用户输入初始化管理员码） */
import { useState } from 'react';
import { ArrowRight, Film, KeyRound, Lock, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { api, AUTH_TOKEN_KEY } from '../api';
import { useStore } from '../store';

export function JoinPage() {
  const { refreshMember } = useStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [initCode, setInitCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      if (mode === 'login') {
        const res = await api.login(phone.trim(), password);
        localStorage.setItem(AUTH_TOKEN_KEY, res.token);
      } else {
        const res = await api.register(phone.trim(), password, nickname.trim(), initCode.trim() || undefined);
        // 注册成功：自动登录（签发 token）→ 若无 token 则提示去登录
        if (res.token) {
          localStorage.setItem(AUTH_TOKEN_KEY, res.token);
        } else {
          setError('注册成功，请使用手机号和密码登录');
          setMode('login');
          setPassword('');
          return;
        }
      }
      await refreshMember();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setError('');
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
            让每一条素材都可查、可用、可追踪
          </p>
        </div>

        {/* 登录/注册卡片 */}
        <div className="rounded-2xl bg-cream-50 p-6 shadow-card hairline">
          {/* 模式切换 */}
          <div className="mb-5 flex gap-1 rounded-lg bg-cream-200/60 p-1">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 rounded-md py-1.5 text-[12.5px] font-medium transition-all ${
                mode === 'login' ? 'bg-cream-50 text-ink-900 shadow-card' : 'text-ink-400'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 rounded-md py-1.5 text-[12.5px] font-medium transition-all ${
                mode === 'register' ? 'bg-cream-50 text-ink-900 shadow-card' : 'text-ink-400'
              }`}
            >
              注册
            </button>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-ink-700">
                <Phone size={12} className="text-forest-600" />
                手机号
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                onKeyDown={(e) => e.key === 'Enter' && void submit()}
                placeholder="11 位手机号"
                inputMode="numeric"
                className="h-10 w-full rounded-lg border border-ink-900/8 bg-cream-200/60 px-3 text-[13px] tabular outline-none focus:border-forest-500/50 focus:ring-2 focus:ring-forest-500/15"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-ink-700">
                <Lock size={12} className="text-forest-600" />
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void submit()}
                placeholder={mode === 'register' ? '6-32 位密码' : '请输入密码'}
                className="h-10 w-full rounded-lg border border-ink-900/8 bg-cream-200/60 px-3 text-[13px] outline-none focus:border-forest-500/50 focus:ring-2 focus:ring-forest-500/15"
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-ink-700">
                    <UserRound size={12} className="text-forest-600" />
                    昵称
                  </label>
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void submit()}
                    placeholder="团队中显示的名称"
                    maxLength={24}
                    className="h-10 w-full rounded-lg border border-ink-900/8 bg-cream-200/60 px-3 text-[13px] outline-none focus:border-forest-500/50 focus:ring-2 focus:ring-forest-500/15"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-ink-700">
                    <KeyRound size={12} className="text-forest-600" />
                    初始化管理员码
                    <span className="font-normal text-ink-300">（仅第一个注册的账号需要）</span>
                  </label>
                  <input
                    value={initCode}
                    onChange={(e) => setInitCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && void submit()}
                    placeholder="服务器启动日志中的一次性代码"
                    className="h-10 w-full rounded-lg border border-ink-900/8 bg-cream-200/60 px-3 font-mono text-[12.5px] tracking-wide outline-none focus:border-forest-500/50 focus:ring-2 focus:ring-forest-500/15"
                  />
                </div>
              </>
            )}

            {error && (
              <p className="rounded-lg bg-alert-soft px-3 py-2 text-[12px] text-alert">{error}</p>
            )}

            <button
              onClick={() => void submit()}
              disabled={!phone.trim() || !password || submitting}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-forest-700 text-[13px] font-medium text-cream-50 shadow-card transition-all hover:bg-forest-600 active:scale-[0.99] disabled:opacity-40"
            >
              {submitting ? '请稍候…' : mode === 'login' ? '登录' : '注册并进入'}
              {!submitting && <ArrowRight size={14} />}
            </button>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-cream-200/50 p-3">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-forest-600" />
            <p className="text-[11px] leading-relaxed text-ink-400">
              手机号仅作为登录账号，无需短信验证。密码加密存储，连续输错 5 次将锁定 10 分钟。
              第一个注册的账号为核心管理员，可管理全部用户。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
