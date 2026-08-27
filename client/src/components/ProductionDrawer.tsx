/** 成片详情抽屉：成片信息、引用素材管理（添加/移除，联动使用次数） */
import { useEffect, useMemo, useState } from 'react';
import { Check, Film, Plus, Search, Trash2, X } from 'lucide-react';
import type { Asset, ProductionDetail } from '../types';
import { api, formatDate, formatDuration, thumbUrl } from '../api';
import { useStore } from '../store';
import { AssetCard } from './AssetCard';

export function ProductionDrawer() {
  const { productionDrawerId, closeDrawer, bumpAssets } = useStore();
  const [detail, setDetail] = useState<ProductionDetail | null>(null);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [pool, setPool] = useState<Asset[]>([]);
  const [picked, setPicked] = useState<number[]>([]);

  useEffect(() => {
    if (!productionDrawerId) {
      setDetail(null);
      return;
    }
    void api.getProduction(productionDrawerId).then(setDetail);
  }, [productionDrawerId]);

  /** 打开选择面板时拉取素材池 */
  const openPicker = async () => {
    setAdding(true);
    setPicked([]);
    setSearch('');
    const { items } = await api.listAssets({ pageSize: 200 });
    const used = new Set(detail?.assets.map((a) => a.id) ?? []);
    setPool(items.filter((a) => !used.has(a.id)));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(
      (a) => a.filename.toLowerCase().includes(q) || a.code.toLowerCase().includes(q),
    );
  }, [pool, search]);

  const confirmAdd = async () => {
    if (!detail || picked.length === 0) return;
    await api.addProductionAssets(detail.id, picked);
    setAdding(false);
    setDetail(await api.getProduction(detail.id));
    bumpAssets();
  };

  const removeAsset = async (relationId: number) => {
    if (!detail) return;
    await api.removeProductionAsset(detail.id, relationId);
    setDetail(await api.getProduction(detail.id));
    bumpAssets();
  };

  if (!productionDrawerId || !detail) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fade-in absolute inset-0 bg-forest-950/30 backdrop-blur-[2px]" onClick={closeDrawer} />
      <div className="rise-in absolute top-0 right-0 flex h-full w-[560px] max-w-[94vw] flex-col bg-cream-50 shadow-drawer">
        {/* 头部 */}
        <div className="flex items-center gap-3 border-b border-ink-900/6 px-5 py-3.5">
          <span className="font-mono text-[12px] font-semibold text-forest-700">{detail.code}</span>
          <span className="truncate text-[13px] font-medium text-ink-900">{detail.title}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
              detail.publish_status === 'published'
                ? 'bg-forest-100 text-forest-700'
                : 'bg-ink-900/6 text-ink-400'
            }`}
          >
            {detail.publish_status === 'published' ? '已发布' : '草稿'}
          </span>
          <button
            onClick={closeDrawer}
            className="ml-auto rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-900/6 hover:text-ink-900"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!adding ? (
            <div className="space-y-5 p-5">
              {/* 成片信息 */}
              <div className="rounded-xl bg-cream-200/50 p-4 text-[12px]">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-24 items-center justify-center rounded-lg bg-forest-950 text-cream-100/70">
                    <Film size={18} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[13px] font-medium text-ink-900">{detail.title}</p>
                    <p className="text-[11px] text-ink-400">
                      创建于 {formatDate(detail.created_at)}
                      {detail.duration ? ` · 时长 ${formatDuration(detail.duration)}` : ''}
                    </p>
                    <p className="text-[11px] text-ink-400">
                      引用素材 {detail.assets.length} 个
                    </p>
                  </div>
                </div>
                {detail.description && (
                  <p className="mt-3 border-t border-ink-900/6 pt-2.5 text-[11.5px] leading-relaxed text-ink-500">
                    {detail.description}
                  </p>
                )}
              </div>

              {/* 引用素材列表 */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[12.5px] font-semibold text-ink-900">引用素材</p>
                  <button
                    onClick={() => void openPicker()}
                    className="flex items-center gap-1 rounded-lg bg-forest-700 px-3 py-1.5 text-[12px] font-medium text-cream-50 shadow-card transition-all hover:bg-forest-600 active:scale-[0.98]"
                  >
                    <Plus size={13} />
                    添加素材
                  </button>
                </div>

                {detail.assets.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-ink-900/10 px-3 py-6 text-center text-[12px] text-ink-400">
                    尚未引用素材。添加素材后，素材的使用次数会自动累计。
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detail.assets.map((a) => {
                      const thumb = thumbUrl(a);
                      return (
                        <div
                          key={a.relation_id}
                          className="group flex items-center gap-3 rounded-xl bg-cream-200/50 p-2 pr-3"
                        >
                          <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-forest-950">
                            {thumb ? (
                              <img src={thumb} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[9px] text-forest-300/50">
                                NO THUMB
                              </div>
                            )}
                            {a.duration != null && (
                              <span className="absolute right-1 bottom-0.5 rounded bg-forest-950/70 px-1 tabular text-[9px] text-cream-100">
                                {formatDuration(a.duration)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-[10.5px] text-forest-700">{a.code}</p>
                            <p className="truncate text-[12px] font-medium text-ink-900">{a.filename}</p>
                            <p className="text-[10.5px] text-ink-300">{formatDate(a.used_at)} 加入</p>
                          </div>
                          <button
                            onClick={() => void removeAsset(a.relation_id)}
                            className="rounded-lg p-1.5 text-ink-300 opacity-0 transition-all hover:bg-[#fdf0ec] hover:text-alert group-hover:opacity-100"
                            title="移除引用"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 选择素材面板 */
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2 border-b border-ink-900/6 px-5 py-3">
                <div className="relative flex-1">
                  <Search size={13} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-300" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜索素材…"
                    className="h-8 w-full rounded-lg border border-ink-900/8 bg-cream-200/60 pl-8 text-[12.5px] outline-none focus:border-forest-500/50 focus:ring-2 focus:ring-forest-500/15"
                  />
                </div>
                <button
                  onClick={() => setAdding(false)}
                  className="rounded-lg px-2.5 py-1.5 text-[12px] text-ink-400 hover:bg-ink-900/5"
                >
                  取消
                </button>
                <button
                  onClick={() => void confirmAdd()}
                  disabled={picked.length === 0}
                  className="flex items-center gap-1 rounded-lg bg-forest-700 px-3.5 py-1.5 text-[12px] font-medium text-cream-50 shadow-card transition-all hover:bg-forest-600 active:scale-[0.98] disabled:opacity-40"
                >
                  <Check size={13} />
                  添加 {picked.length > 0 ? picked.length : ''}
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {filtered.length === 0 ? (
                  <p className="py-10 text-center text-[12px] text-ink-400">没有可添加的素材</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filtered.map((a) => (
                      <AssetCard
                        key={a.id}
                        asset={a}
                        onOpen={() => {}}
                        selectable
                        selected={picked.includes(a.id)}
                        onToggleSelect={(id) =>
                          setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
