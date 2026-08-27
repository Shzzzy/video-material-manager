/** 主题切换面板：自动跟随时间（早/午/晚/夜）+ 手动主题色板 */
import { Check, Clock, Palette, Sun, Sunrise, Moon, Sunset } from 'lucide-react';
import {
  AUTO_THEME,
  currentTimeTheme,
  currentTimeThemeName,
  THEMES,
  TIME_THEMES,
  type TimeThemeId,
} from '../themes';
import { useStore } from '../store';
import { Modal } from './Modal';

/** 时段图标 */
const TIME_ICONS: Record<TimeThemeId, typeof Sun> = {
  'auto-morning': Sunrise,
  'auto-noon': Sun,
  'auto-afternoon': Sunset,
  'auto-night': Moon,
};

export function ThemeDialog() {
  const { themeDialogOpen, setThemeDialogOpen, theme, setTheme } = useStore();
  const isAuto = theme === AUTO_THEME;
  const current = currentTimeTheme();

  return (
    <Modal
      open={themeDialogOpen}
      onClose={() => setThemeDialogOpen(false)}
      title="界面主题"
      subtitle="可手动选择配色，或开启自动模式跟随时间变化"
      width={600}
    >
      <div className="p-5">
        {/* 自动跟随时间卡片 */}
        <button
          onClick={() => setTheme(AUTO_THEME)}
          className={`group relative w-full overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 ${
            isAuto
              ? 'border-forest-600 ring-2 ring-forest-500/25'
              : 'border-ink-900/10 hover:border-ink-900/20 hover:shadow-card'
          }`}
        >
          {/* 时段渐变背景条：晨光 → 正午 → 黄昏 → 夜晚 */}
          <div className="mb-3 flex h-14 overflow-hidden rounded-lg">
            {TIME_THEMES.map((t) => {
              const Icon = TIME_ICONS[t.id];
              const palette = {
                'auto-morning': { from: '#fdf3dc', to: '#dceadf', icon: '#c9973a' },
                'auto-noon': { from: '#e8f4fb', to: '#eef7f2', icon: '#2f7a62' },
                'auto-afternoon': { from: '#fbe3c0', to: '#f3d9b8', icon: '#b06a24' },
                'auto-night': { from: '#1b2740', to: '#0e141f', icon: '#7ca3bd' },
              }[t.id];
              const active = t.id === current;
              return (
                <div
                  key={t.id}
                  className={`relative flex flex-1 flex-col items-center justify-center gap-1 transition-all duration-300 ${
                    active ? 'scale-[1.04]' : 'opacity-80'
                  }`}
                  style={{ background: `linear-gradient(135deg, ${palette.from}, ${palette.to})` }}
                >
                  <Icon size={15} style={{ color: palette.icon }} />
                  <span
                    className={`text-[10px] font-medium ${
                      t.id === 'auto-night' ? 'text-[#b4c3d4]' : 'text-ink-700'
                    }`}
                  >
                    {t.name}
                  </span>
                  {active && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-forest-600 text-white shadow-card">
                      <Check size={9} strokeWidth={3.5} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isAuto ? 'bg-forest-600 text-cream-50' : 'bg-ink-900/5 text-ink-400'
              }`}
            >
              <Clock size={15} />
            </span>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-ink-900">
                自动跟随时间
                {isAuto && (
                  <span className="ml-2 rounded-md bg-forest-100 px-1.5 py-0.5 text-[10.5px] font-medium text-forest-700">
                    当前时段：{currentTimeThemeName()}
                  </span>
                )}
              </p>
              <p className="text-[11px] text-ink-400">
                早晨 05:00 / 正午 11:00 / 黄昏 16:00 / 夜晚 19:00 自动切换
              </p>
            </div>
            {!isAuto && (
              <span className="text-[11px] font-medium text-forest-600 opacity-0 transition-opacity group-hover:opacity-100">
                开启 →
              </span>
            )}
          </div>
        </button>

        {/* 手动主题网格 */}
        <p className="mt-4 mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-ink-400 uppercase">
          <Palette size={11} />
          手动配色
        </p>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`group relative overflow-hidden rounded-xl border p-3 text-left transition-all duration-200 ${
                  active
                    ? 'border-forest-600 ring-2 ring-forest-500/25'
                    : 'border-ink-900/10 hover:border-ink-900/20 hover:shadow-card'
                }`}
                style={{ background: t.preview.bg }}
              >
                {/* 预览画布：模拟页面布局 */}
                <div className="flex h-16 overflow-hidden rounded-lg border border-ink-900/8">
                  <div className="w-4 shrink-0" style={{ background: t.preview.accent }} />
                  <div className="flex flex-1">
                    <div className="w-10 border-r border-ink-900/6" style={{ background: t.preview.panel }} />
                    <div className="flex-1 space-y-1.5 p-2">
                      <div className="h-2 w-3/5 rounded-full" style={{ background: t.preview.accent }} />
                      <div
                        className="h-1.5 w-full rounded-full opacity-40"
                        style={{ background: t.preview.text }}
                      />
                      <div
                        className="h-1.5 w-4/5 rounded-full opacity-25"
                        style={{ background: t.preview.text }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <span
                    className="flex h-4.5 w-4.5 items-center justify-center rounded-full"
                    style={{ background: t.preview.accent }}
                  >
                    {active && <Check size={10} className="text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-[13px] font-semibold" style={{ color: t.preview.text }}>
                    {t.name}
                  </span>
                  {t.dark && (
                    <span
                      className="rounded px-1.5 py-px text-[9.5px] font-medium"
                      style={{ background: `${t.preview.accent}22`, color: t.preview.accent }}
                    >
                      深色
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px]" style={{ color: t.preview.text, opacity: 0.55 }}>
                  {t.desc}
                </p>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] text-ink-300">
          主题偏好保存在浏览器本地；自动模式每 5 分钟校准一次时段。
        </p>
      </div>
    </Modal>
  );
}
