/**
 * 主题定义：每套主题通过 CSS 变量覆盖 Tailwind 设计令牌
 * 变量在 index.css 的 [data-theme='xxx'] 块中定义
 */

export interface ThemeDef {
  id: string;
  name: string;
  desc: string;
  /** 深色主题（影响遮罩等默认样式） */
  dark: boolean;
  /** 预览色块 */
  preview: {
    bg: string;
    accent: string;
    text: string;
    panel: string;
  };
}

export const THEMES: ThemeDef[] = [
  {
    id: 'cream',
    name: '暖白',
    desc: '米白底色 · 深墨绿 · 温暖自然',
    dark: false,
    preview: { bg: '#fdfcf7', accent: '#255c45', text: '#17181a', panel: '#fffefa' },
  },
  {
    id: 'mist',
    name: '雾蓝',
    desc: '蓝白底色 · 深海蓝 · 清爽冷静',
    dark: false,
    preview: { bg: '#f2f6fa', accent: '#2a4d7a', text: '#1b2430', panel: '#f9fbfd' },
  },
  {
    id: 'forest',
    name: '墨夜',
    desc: '深墨绿底色 · 柔光绿 · 沉稳护眼',
    dark: true,
    preview: { bg: '#131b16', accent: '#5daa82', text: '#dfeae3', panel: '#1b2620' },
  },
  {
    id: 'midnight',
    name: '极夜',
    desc: '近黑底色 · 冷蓝青 · 沉浸专注',
    dark: true,
    preview: { bg: '#0e1013', accent: '#6fb3d4', text: '#dde4ea', panel: '#161a1f' },
  },
];

export type ThemeId = (typeof THEMES)[number]['id'];

/** 默认主题 */
export const DEFAULT_THEME: ThemeId = 'cream';

/** 主题存储键 */
export const THEME_STORAGE_KEY = 'caw-theme';

/* ================= 自动跟随时间（早上/中午/下午/晚上） ================= */

/** 自动模式的存储值 */
export const AUTO_THEME = 'auto';

/** 时间段主题 id（对应 index.css 中的 [data-theme] 块） */
export type TimeThemeId = 'auto-morning' | 'auto-noon' | 'auto-afternoon' | 'auto-night';

/** 时间段定义 */
export const TIME_THEMES: Array<{ id: TimeThemeId; name: string; range: string; desc: string }> = [
  { id: 'auto-morning', name: '早晨', range: '05:00 – 11:00', desc: '晨光暖米 · 清新明亮' },
  { id: 'auto-noon', name: '正午', range: '11:00 – 16:00', desc: '正午亮白 · 清爽通透' },
  { id: 'auto-afternoon', name: '黄昏', range: '16:00 – 19:00', desc: '落日暖金 · 温柔舒缓' },
  { id: 'auto-night', name: '夜晚', range: '19:00 – 05:00', desc: '深夜蓝黑 · 护眼专注' },
];

/** 根据小时返回对应时间段主题 */
export function timeThemeForHour(hour: number): TimeThemeId {
  if (hour >= 5 && hour < 11) return 'auto-morning';
  if (hour >= 11 && hour < 16) return 'auto-noon';
  if (hour >= 16 && hour < 19) return 'auto-afternoon';
  return 'auto-night';
}

/** 当前时间段主题 */
export function currentTimeTheme(): TimeThemeId {
  return timeThemeForHour(new Date().getHours());
}

/** 当前时间段名称（面板展示用） */
export function currentTimeThemeName(): string {
  return TIME_THEMES.find((t) => t.id === currentTimeTheme())?.name ?? '夜晚';
}

/* ================= 持久化与应用 ================= */

/** 读取主题偏好（'auto' 或具体主题 id） */
export function loadTheme(): string {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === AUTO_THEME) return AUTO_THEME;
    if (saved && THEMES.some((t) => t.id === saved)) return saved;
  } catch {
    /* 忽略存储异常 */
  }
  return DEFAULT_THEME;
}

/** 应用主题到 <html data-theme>：auto 时按当前时间取时段主题 */
export function applyTheme(pref: string): void {
  const resolved = pref === AUTO_THEME ? currentTimeTheme() : pref;
  document.documentElement.dataset.theme = resolved;
}

/** 持久化主题偏好 */
export function saveTheme(pref: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* 忽略 */
  }
}
