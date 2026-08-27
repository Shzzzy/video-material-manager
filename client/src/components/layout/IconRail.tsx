/** 最左极窄图标导航栏：深色，品牌 Logo + 各板块入口 */
import { NavLink } from 'react-router-dom';
import {
  Clapperboard,
  Film,
  History,
  Layers,
  Settings,
  Users,
} from 'lucide-react';

const items = [
  { to: '/assets', icon: Film, label: '素材库' },
  { to: '/productions', icon: Clapperboard, label: '成片库' },
  { to: '/usage', icon: History, label: '使用记录' },
  { to: '/tags', icon: Layers, label: '标签管理' },
  { to: '/team', icon: Users, label: '团队同步' },
];

export function IconRail() {
  return (
    <nav className="flex w-14 shrink-0 flex-col items-center gap-1.5 bg-forest-950 py-3">
      {/* 品牌 Logo */}
      <div
        className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-forest-600 text-cream-100 shadow-float"
        title="创意素材工作台"
      >
        <Film size={17} strokeWidth={2.2} />
      </div>

      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          title={it.label}
          className={({ isActive }) =>
            [
              'flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150',
              isActive
                ? 'bg-forest-600 text-cream-50 shadow-float'
                : 'text-forest-300/70 hover:bg-white/8 hover:text-cream-100',
            ].join(' ')
          }
        >
          <it.icon size={17} strokeWidth={2} />
        </NavLink>
      ))}

      <div className="flex-1" />

      {/* 底部设置入口 */}
      <NavLink
        to="/tags"
        title="设置与标签"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-forest-300/50 transition-colors hover:bg-white/8 hover:text-cream-100"
      >
        <Settings size={16} strokeWidth={2} />
      </NavLink>
    </nav>
  );
}
