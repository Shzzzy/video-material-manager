/** 顶栏：品牌区 + 搜索 + 黄金3秒开关 + 主操作按钮 */
import { useLocation, useNavigate } from 'react-router-dom';
import { FolderSearch, Search, UploadCloud } from 'lucide-react';
import { useStore } from '../../store';

interface TopBarProps {
  search?: string;
  onSearch?: (v: string) => void;
  golden3sOnly?: boolean;
  onGolden3s?: (v: boolean) => void;
  /** 是否为素材库页面（显示搜索/黄金3秒） */
  showAssetTools?: boolean;
}

export function TopBar({
  search = '',
  onSearch,
  golden3sOnly = false,
  onGolden3s,
  showAssetTools = false,
}: TopBarProps) {
  const { setUploadOpen } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  const pageName =
    location.pathname === '/productions'
      ? '成片库'
      : location.pathname === '/usage'
        ? '使用记录'
        : location.pathname === '/tags'
          ? '标签管理'
          : location.pathname === '/team'
            ? '团队同步'
            : '素材库';

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-ink-900/6 bg-cream-50/90 px-5 backdrop-blur">
      {/* 页面标题区 */}
      <div className="flex min-w-0 items-baseline gap-2.5">
        <h1 className="text-[15px] font-semibold tracking-wide text-ink-900">{pageName}</h1>
        <span className="hidden truncate text-[11px] text-ink-300 md:inline">
          让每一条素材都可查、可用、可追踪
        </span>
      </div>

      <div className="flex-1" />

      {/* 素材库工具：搜索 + 黄金3秒 */}
      {showAssetTools && (
        <>
          <div className="relative w-64">
            <Search size={13} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-300" />
            <input
              value={search}
              onChange={(e) => onSearch?.(e.target.value)}
              placeholder="搜索编号、文件名或标签"
              className="h-8.5 w-full rounded-lg border border-ink-900/8 bg-cream-200/60 pr-3 pl-8.5 text-[12.5px] text-ink-900 placeholder:text-ink-300 transition-all outline-none focus:border-forest-500/50 focus:bg-cream-50 focus:ring-2 focus:ring-forest-500/15"
            />
          </div>
          <button
            onClick={() => onGolden3s?.(!golden3sOnly)}
            className={`flex h-8.5 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium transition-all duration-150 ${
              golden3sOnly
                ? 'border-gold/50 bg-gold-soft text-[#8a6a1d]'
                : 'border-ink-900/8 bg-cream-200/60 text-ink-500 hover:border-ink-900/16 hover:text-ink-900'
            }`}
            title="只显示标记为黄金3秒的素材"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${golden3sOnly ? 'bg-gold' : 'bg-ink-300'}`} />
            只看黄金3秒
          </button>
        </>
      )}

      {/* 主操作按钮 */}
      <button
        onClick={() => navigate('/tags')}
        className="flex h-8.5 items-center gap-1.5 rounded-lg border border-ink-900/8 bg-cream-200/60 px-3 text-[12px] font-medium text-ink-700 transition-all duration-150 hover:border-ink-900/16 hover:bg-cream-200"
      >
        <FolderSearch size={13} />
        扫描文件夹
      </button>
      <button
        onClick={() => setUploadOpen(true)}
        className="flex h-8.5 items-center gap-1.5 rounded-lg bg-forest-700 px-4 text-[12.5px] font-medium text-cream-50 shadow-card transition-all duration-150 hover:bg-forest-600 hover:shadow-card-hover active:scale-[0.98]"
      >
        <UploadCloud size={14} />
        上传素材
      </button>
    </header>
  );
}
