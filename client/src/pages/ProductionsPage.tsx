/** 成片库页面：状态筛选 + 成片列表 + 新建成片 + 使用排行 */
import { useEffect, useMemo, useState } from 'react';
import { Clapperboard, Film, Plus, Search, TrendingUp, Trash2 } from 'lucide-react';
import type { Production } from '../types';
import { api, formatDate, formatDuration } from '../api';
import { useStore } from '../store';
import { Modal } from '../components/Modal';
import { PRODUCTION_STATUSES, StatusBadge, type ProductionStatusKey } from '../components/productionStatus';

export function ProductionsPage() {
  const { openProduction, bumpAssets, assetsVersion } = useStore();
  const [items, setItems] = useState<Production[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductionStatusKey | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ranking, setRanking] = useState<
    Array<{ id: number; code: string; filename: string; thumbnail_path: string | null; usageCount: number }>
  >([]);

  const load = async (q = search) => {
    setItems(await api.listProductions(q));
  };

  useEffect(() => {
    void load();
    // 使用排行（按素材聚合使用记录）
    void api.usageLog().then((logs) => {
      const map = new Map<
        number,
        { code: string; filename: string; thumbnail_path: string | null; count: number }
      >();
      for (const l of logs) {
        const cur = map.get(l.asset_id);
        if (cur) cur.count++;
        else
          map.set(l.asset_id, {
            code: l.asset_code,
            filename: l.filename,
            thumbnail_path: l.thumbnail_path,
            count: 1,
          });
      }
      setRanking(
        [...map.entries()]
          .map(([id, v]) => ({ id, ...v, usageCount: v.count }))
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, 8),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetsVersion]);

  const filtered = useMemo(
    () => (statusFilter ? items.filter((p) => p.publish_status === statusFilter) : items),
    [items, statusFilter],
  );

  const create = async () => {
    if (!title.trim()) return;
    await api.createProduction({ title: title.trim(), description: description.trim() || undefined });
    setCreating(false);
    setTitle('');
    setDescription('');
    bumpAssets();
  };

  const remove = async (id: number) => {
    if (!confirm('确认删除该成片？引用记录将一并删除，相关素材的使用次数会相应减少。')) return;
    await api.deleteProduction(id);
    bumpAssets();
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      {/* 头部操作区 */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative w-72">
          <Search
            size={13}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-300"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              void load(e.target.value);
            }}
            placeholder="搜索成片标题或编号"
            className="h-8.5 w-full rounded-lg border border-ink-900/8 bg-cream-200/60 pl-8 text-[12.5px] outline-none focus:border-forest-500/50 focus:ring-2 focus:ring-forest-500/15"
          />
        </div>
        <button
          onClick={() => setCreating(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-forest-700 px-4 py-2 text-[12.5px] font-medium text-cream-50 shadow-card transition-all hover:bg-forest-600 active:scale-[0.98]"
        >
          <Plus size={14} />
          新建成片
        </button>
      </div>

      {/* 状态筛选 Tab */}
      <div className="mb-4 flex items-center gap-1">
        <button
          onClick={() => setStatusFilter(null)}
          className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
            statusFilter === null
              ? 'bg-forest-700 text-cream-50 shadow-card'
              : 'text-ink-500 hover:bg-ink-900/5'
          }`}
        >
          全部
        </button>
        {PRODUCTION_STATUSES.map((s) => {
          const active = statusFilter === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
                active ? 'bg-forest-700 text-cream-50 shadow-card' : 'text-ink-500 hover:bg-ink-900/5'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* 成片列表 + 使用排行 */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* 成片列表 */}
        <div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-900/10 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-800 text-cream-100">
                <Clapperboard size={22} />
              </div>
              <h2 className="mt-4 text-[15px] font-semibold text-ink-900">
                {statusFilter ? `没有「${PRODUCTION_STATUSES.find((s) => s.key === statusFilter)?.label}」的成片` : '还没有成片'}
              </h2>
              <p className="mt-1 text-[12px] text-ink-400">
                创建成片并引用素材，系统会自动记录素材的使用次数
              </p>
              {!statusFilter && (
                <button
                  onClick={() => setCreating(true)}
                  className="mt-5 flex items-center gap-1.5 rounded-xl bg-forest-700 px-5 py-2.5 text-[13px] font-medium text-cream-50 shadow-card transition-all hover:bg-forest-600 active:scale-[0.98]"
                >
                  <Plus size={15} />
                  新建成片
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((p, i) => (
                <div
                  key={p.id}
                  onClick={() => openProduction(p.id)}
                  className="card-lift rise-in group flex cursor-pointer items-center gap-4 rounded-xl bg-cream-50 p-3.5 shadow-card hairline"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {/* 封面占位 */}
                  <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-forest-700 to-forest-950 text-cream-100/60">
                    <Film size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-forest-700">{p.code}</span>
                      <h3 className="truncate text-[13.5px] font-semibold text-ink-900">{p.title}</h3>
                      <StatusBadge status={p.publish_status} />
                    </div>
                    <p className="mt-1 truncate text-[11.5px] text-ink-400">
                      引用素材 {p.assetCount} 个 · 创建于 {formatDate(p.created_at)}
                      {p.duration ? ` · ${formatDuration(p.duration)}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="tabular text-[16px] font-semibold text-forest-700">{p.assetCount}</p>
                      <p className="text-[10px] text-ink-300">素材引用</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void remove(p.id);
                      }}
                      className="rounded-lg p-1.5 text-ink-300 opacity-0 transition-all hover:bg-[#fdf0ec] hover:text-alert group-hover:opacity-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 使用排行侧栏 */}
        <aside>
          <div className="sticky top-0 rounded-xl bg-cream-50 p-4 shadow-card hairline">
            <div className="mb-3 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-forest-600" />
              <h3 className="text-[12.5px] font-semibold text-ink-900">素材使用排行</h3>
            </div>
            {ranking.length === 0 ? (
              <p className="py-6 text-center text-[11.5px] text-ink-300">暂无数据</p>
            ) : (
              <div className="space-y-2">
                {ranking.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-2.5">
                    <span
                      className={`w-4 text-center tabular text-[12px] font-semibold ${i < 3 ? 'text-gold' : 'text-ink-300'}`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-medium text-ink-700">{r.filename}</p>
                      <p className="font-mono text-[10px] text-ink-300">{r.code}</p>
                    </div>
                    <span className="tabular shrink-0 rounded-md bg-forest-100 px-1.5 py-0.5 text-[11px] font-semibold text-forest-700">
                      {r.usageCount} 次
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 新建成片 */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="新建成片"
        subtitle="成片用于组织素材引用，引用即累计素材使用次数"
        width={480}
      >
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-ink-700">成片标题</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void create()}
              placeholder="例如：XX品牌 2026 夏季宣传片"
              className="h-9 w-full rounded-lg border border-ink-900/8 bg-cream-200/60 px-3 text-[13px] outline-none focus:border-forest-500/50 focus:ring-2 focus:ring-forest-500/15"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-ink-700">描述（可选）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="成片简介、用途说明…"
              className="w-full resize-none rounded-lg border border-ink-900/8 bg-cream-200/60 px-3 py-2 text-[13px] outline-none focus:border-forest-500/50 focus:ring-2 focus:ring-forest-500/15"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setCreating(false)}
              className="rounded-lg px-4 py-2 text-[12.5px] text-ink-400 hover:bg-ink-900/5"
            >
              取消
            </button>
            <button
              onClick={() => void create()}
              disabled={!title.trim()}
              className="rounded-lg bg-forest-700 px-5 py-2 text-[12.5px] font-medium text-cream-50 shadow-card transition-all hover:bg-forest-600 active:scale-[0.98] disabled:opacity-40"
            >
              创建
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
