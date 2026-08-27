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

/** 读取当前主题（localStorage → 默认） */
export function loadTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && THEMES.some((t) => t.id === saved)) return saved as ThemeId;
  } catch {
    /* 忽略存储异常 */
  }
  return DEFAULT_THEME;
}

/** 应用主题到 <html data-theme>，并持久化 */
export function applyTheme(id: ThemeId): void {
  document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    /* 忽略 */
  }
}
