/** 主侧边栏：板块标题 + 分类标签快捷筛选（全局唯一，筛选状态来自 store） */
import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ChevronDown, FolderTree, Plus, Sparkles } from 'lucide-react';
import { useStore } from '../../store';

export function Sidebar() {
  const { categories, setUploadOpen, setUploadMode, assetTagIds, setAssetTagIds } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  // 仅素材库页面展示分类筛选
  const showFilters = location.pathname === '/assets' || location.pathname === '/';
  const isAssets = showFilters;

  const toggleTag = (tagId: number) => {
    setAssetTagIds(
      assetTagIds.includes(tagId)
        ? assetTagIds.filter((t) => t !== tagId)
        : [...assetTagIds, tagId],
    );
  };

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-ink-900/6 bg-cream-200/70 backdrop-blur">
      {/* 板块标题 */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <div className="flex h-6 items-center rounded-md bg-forest-800 px-1.5 text-[11px] font-semibold tracking-wide text-cream-100">
          素材雷达
        </div>
        <span className="text-[11px] font-medium tracking-wide text-ink-400">CREATIVEASSET</span>
      </div>

      {/* 素材库专用：分类筛选树 */}
      {isAssets && (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-1">
          <div className="mb-1 flex items-center justify-between px-2">
            <span className="text-[11px] font-semibold tracking-wider text-ink-400">
              分类标签
            </span>
            <button
              onClick={() => navigate('/tags')}
              className="rounded p-0.5 text-ink-300 transition-colors hover:bg-ink-900/6 hover:text-ink-700"
              title="管理分类标签"
            >
              <Plus size={13} />
            </button>
          </div>

          {categories.length === 0 && (
            <div className="mx-2 mt-1 rounded-lg border border-dashed border-ink-900/10 px-3 py-2.5 text-[11px] leading-relaxed text-ink-400">
              还没有分类标签。
              <br />
              创建「拍摄人员 / 场景 / 景别」等维度开始整理素材。
            </div>
          )}

          {categories.map((cat) => {
            const open = !collapsed[cat.id];
            const hasActive = cat.tags.some((t) => assetTagIds.includes(t.id));
            return (
              <div key={cat.id} className="mb-0.5">
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [cat.id]: !c[cat.id] }))}
                  className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors ${
                    hasActive ? 'bg-forest-100/80 font-medium text-forest-800' : 'text-ink-700 hover:bg-ink-900/4'
                  }`}
                >
                  <ChevronDown
                    size={12}
                    className={`shrink-0 text-ink-300 transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
                  />
                  <FolderTree size={13} className="shrink-0 text-forest-600" />
                  <span className="truncate">{cat.name}</span>
                  <span className="ml-auto tabular text-[10.5px] text-ink-300">
                    {cat.tags.length}
                  </span>
                </button>

                {open && (
                  <div className="ml-5 space-y-px border-l border-ink-900/8 pl-2 pb-1 pt-0.5">
                    {cat.tags.map((t) => {
                      const active = assetTagIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggleTag(t.id)}
                          className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-[12px] transition-all duration-150 ${
                            active
                              ? 'bg-forest-600 font-medium text-cream-50'
                              : 'text-ink-500 hover:bg-ink-900/4 hover:text-ink-900'
                          }`}
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: t.color }}
                          />
                          <span className="truncate">{t.name}</span>
                        </button>
                      );
                    })}
                    {cat.tags.length === 0 && (
                      <div className="px-2 py-0.5 text-[11px] text-ink-300">暂无标签</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isAssets && <div className="flex-1" />}

      {/* 底部：AI 能力入口 */}
      <div className="border-t border-ink-900/6 p-3">
        <button
          onClick={() => {
            setUploadMode('upload');
            setUploadOpen(true);
          }}
          className="flex w-full items-center gap-2 rounded-lg bg-forest-800 px-3 py-2 text-[12px] font-medium text-cream-100 shadow-card transition-all duration-150 hover:bg-forest-700 hover:shadow-card-hover active:scale-[0.98]"
        >
          <Sparkles size={13} />
          导入素材文件
        </button>
        <p className="mt-2 px-1 text-[10.5px] leading-relaxed text-ink-300">
          原片不会上传云端，仅发送缩略图与元数据用于识别与索引。
        </p>
      </div>
    </aside>
  );
}
