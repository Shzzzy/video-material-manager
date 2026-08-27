/** 主题切换面板：色板卡片预览，点击即应用并持久化 */
import { Check, Palette } from 'lucide-react';
import { THEMES } from '../themes';
import { useStore } from '../store';
import { Modal } from './Modal';

export function ThemeDialog() {
  const { themeDialogOpen, setThemeDialogOpen, theme, setTheme } = useStore();

  return (
    <Modal
      open={themeDialogOpen}
      onClose={() => setThemeDialogOpen(false)}
      title="界面主题"
      subtitle="选择喜欢的配色，切换即时生效并自动保存"
      width={560}
    >
      <div className="grid grid-cols-2 gap-3 p-5">
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
              <div className="flex h-20 overflow-hidden rounded-lg border border-ink-900/8">
                {/* 模拟图标栏 */}
                <div
                  className="w-4 shrink-0"
                  style={{ background: t.preview.accent }}
                />
                {/* 模拟侧边栏 + 内容 */}
                <div className="flex flex-1">
                  <div
                    className="w-10 border-r border-ink-900/6"
                    style={{ background: t.preview.panel }}
                  />
                  <div className="flex-1 space-y-1.5 p-2">
                    <div
                      className="h-2 w-3/5 rounded-full"
                      style={{ background: t.preview.accent }}
                    />
                    <div
                      className="h-1.5 w-full rounded-full opacity-40"
                      style={{ background: t.preview.text }}
                    />
                    <div
                      className="h-1.5 w-4/5 rounded-full opacity-25"
                      style={{ background: t.preview.text }}
                    />
                    <div className="flex gap-1 pt-0.5">
                      <div
                        className="h-4 w-7 rounded-md"
                        style={{ background: t.preview.panel, boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 0.08)' }}
                      />
                      <div
                        className="h-4 w-7 rounded-md"
                        style={{ background: t.preview.panel, boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 0.08)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 名称与描述 */}
              <div className="mt-2.5 flex items-center gap-2">
                <span
                  className="flex h-4.5 w-4.5 items-center justify-center rounded-full"
                  style={{ background: t.preview.accent }}
                >
                  {active && <Check size={10} className="text-white" strokeWidth={3} />}
                </span>
                <span
                  className="text-[13px] font-semibold"
                  style={{ color: t.preview.text }}
                >
                  {t.name}
                </span>
                {t.dark && (
                  <span
                    className="rounded px-1.5 py-px text-[9.5px] font-medium"
                    style={{
                      background: `${t.preview.accent}22`,
                      color: t.preview.accent,
                    }}
                  >
                    深色
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px]" style={{ color: t.preview.text, opacity: 0.55 }}>
                {t.desc}
              </p>

              {/* 选中态浮层标识 */}
              {active && (
                <div
                  className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-card"
                  style={{ background: t.preview.accent }}
                >
                  <Palette size={12} />
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className="px-5 pb-4 text-[11px] text-ink-300">
        主题偏好保存在浏览器本地，所有页面（素材库 / 成片库 / 使用记录 / 标签管理）同步生效。
      </p>
    </Modal>
  );
}
