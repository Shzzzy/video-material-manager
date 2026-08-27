/** 顶栏：品牌区 + 搜索 + 黄金3秒开关 + 主操作按钮（全局唯一，筛选状态来自 store） */
import { useLocation, useNavigate } from 'react-router-dom';
import { FolderSearch, Search, UploadCloud } from 'lucide-react';
import { useStore } from '../../store';

export function TopBar() {
  const { setUploadOpen, assetSearch, setAssetSearch } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  const pageName =
    location.pathname === '/productions'
      ? '成片库'
      : location.pathname === '/usage'
        ? '使用记录'
        : location.pathname === '/tags'
          ? '标签管理'
          : '素材库';

  // 仅素材库页面展示搜索与黄金3秒工具
  const showAssetTools = location.pathname === '/' || location.pathname === '/assets';

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
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
              placeholder="搜索编号、文件名或标签"
              className="h-8.5 w-full rounded-lg border border-ink-900/8 bg-cream-200/60 pr-3 pl-8.5 text-[12.5px] text-ink-900 placeholder:text-ink-300 transition-all outline-none focus:border-forest-500/50 focus:bg-cream-50 focus:ring-2 focus:ring-forest-500/15"
            />
          </div>        </>
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
