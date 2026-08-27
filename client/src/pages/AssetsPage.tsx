/** 素材库页面：状态 Tab + 统计概览 + 网格 + 批量操作 + 空状态 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckSquare,
  Clapperboard,
  Film,
  FolderOpen,
  History,
  Loader2,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import type { Asset, OverviewStats } from '../types';
import { api, formatDuration } from '../api';
import { useStore } from '../store';
import { AssetCard } from '../components/AssetCard';
import { BatchTagModal } from '../components/BatchTagModal';

/** 状态 Tab 定义 */
const STATUS_TABS = [
  { key: null, label: '全部' },
  { key: 'new', label: '待标注' },
  { key: 'organized', label: '已整理' },
  { key: 'used', label: '已使用' },
] as const;

export function AssetsPage() {
  const {
    assetsVersion,
    setUploadOpen,
    openAsset,
    assetSearch,
    assetGolden3s,
    assetTagIds,
    assetStatus,
    setAssetSearch,
    setAssetGolden3s,
    setAssetTagIds,
    setAssetStatus,
  } = useStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OverviewStats | null>(null);

  // 批量选择状态
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchTagOpen, setBatchTagOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(
    async (search: string, golden3s: boolean, tagIds: number[], status: 'new' | 'organized' | 'used' | null) => {
      setLoading(true);
      try {
        const data = await api.listAssets({
          search,
          golden3sOnly: golden3s,
          tagIds,
          status: status ?? undefined,
          pageSize: 120,
        });
        setAssets(data.items);
        setTotal(data.total);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(assetSearch, assetGolden3s, assetTagIds, assetStatus);
    void api.overview().then(setStats);
  }, [assetsVersion, assetSearch, assetGolden3s, assetTagIds, assetStatus, load]);

  const hasFilter = assetSearch.trim() !== '' || assetGolden3s || assetTagIds.length > 0;

  const clearFilters = () => {
    setAssetSearch('');
    setAssetGolden3s(false);
    setAssetTagIds([]);
    setAssetStatus(null);
  };

  // ---- 批量选择 ----
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const batchGolden3s = async (v: boolean) => {
    if (selectedIds.size === 0) return;
    await api.batchSetGolden3s([...selectedIds], v);
    exitSelectMode();
  };

  const batchDelete = async () => {
    if (selectedIds.size === 0) return;
    await api.batchDeleteAssets([...selectedIds]);
    exitSelectMode();
  };

  const selectedAssets = useMemo(
    () => assets.filter((a) => selectedIds.has(a.id)),
    [assets, selectedIds],
  );

  const emptyState = useMemo(() => {
    if (assets.length > 0) return null;
    return (
      <div className="rise-in flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-800 text-cream-100 shadow-float">
          <Film size={26} />
        </div>
        <h2 className="mt-5 text-[16px] font-semibold text-ink-900">
          {hasFilter || assetStatus ? '没有匹配的素材' : '先建立你的第一批素材索引'}
        </h2>
        <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-ink-400">
          {hasFilter || assetStatus
            ? '试试调整搜索关键词或筛选条件'
            : '上传或扫描一个包含视频的文件夹，系统会自动生成编号、指纹、缩略图和基础信息'}
        </p>
        {!hasFilter && !assetStatus && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-forest-700 px-5 py-2.5 text-[13px] font-medium text-cream-50 shadow-card transition-all hover:bg-forest-600 hover:shadow-card-hover active:scale-[0.98]"
            >
              <UploadCloud size={15} />
              上传素材
            </button>
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-ink-900/10 bg-cream-50 px-5 py-2.5 text-[13px] font-medium text-ink-700 shadow-card transition-all hover:border-ink-900/20 active:scale-[0.98]"
            >
              <FolderOpen size={15} />
              扫描文件夹
            </button>
          </div>
        )}
      </div>
    );
  }, [assets.length, hasFilter, assetStatus, setUploadOpen]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* 状态 Tab + 统计概览条（有筛选结果为空时也显示，便于切换回全部） */}
      {stats && (assets.length > 0 || hasFilter || assetStatus) && (
        <div className="sticky top-0 z-10 border-b border-ink-900/6 bg-cream-100/90 backdrop-blur">
          <div className="flex items-center gap-6 px-6 pt-3 pb-2">
            <StatItem icon={<Film size={13} />} label="素材总数" value={stats.assetTotal} />
            <StatItem icon={<Clapperboard size={13} />} label="成片数" value={stats.productionTotal} />
            <StatItem icon={<History size={13} />} label="累计使用" value={stats.usageTotal} />
            <StatItem icon={<Sparkles size={13} />} label="黄金3秒" value={stats.golden3sCount} />
            <div className="ml-auto text-[11.5px] text-ink-400">
              素材总时长{' '}
              <span className="tabular font-medium text-ink-700">
                {formatDuration(stats.totalDuration)}
              </span>
            </div>
          </div>
          {/* 状态 Tab + 批量入口 */}
          <div className="flex items-center gap-1 px-6 pb-2">
            {STATUS_TABS.map((t) => {
              const active = assetStatus === t.key;
              return (
                <button
                  key={String(t.key)}
                  onClick={() => setAssetStatus(t.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-150 ${
                    active
                      ? 'bg-forest-700 text-cream-50 shadow-card'
                      : 'text-ink-500 hover:bg-ink-900/5 hover:text-ink-900'
                  }`}
                >
                  {t.label}
                  {t.key === 'new' && stats.pendingCount > 0 && (
                    <span
                      className={`rounded px-1.5 text-[10px] tabular ${
                        active ? 'bg-cream-50/20 text-cream-50' : 'bg-gold-soft text-[#8a6a1d]'
                      }`}
                    >
                      {stats.pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="ml-auto" />
            {!selectMode ? (
              <button
                onClick={() => setSelectMode(true)}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] text-ink-400 transition-colors hover:bg-ink-900/5 hover:text-ink-700"
              >
                <CheckSquare size={12} />
                批量操作
              </button>
            ) : (
              <button
                onClick={exitSelectMode}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] text-ink-400 transition-colors hover:bg-[#fdf0ec] hover:text-alert"
              >
                <X size={12} />
                退出多选
              </button>
            )}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {/* 结果提示 */}
        {!loading && assets.length > 0 && (
          <p className="mb-3 text-[11.5px] text-ink-400">
            {total} 条结果
            {(hasFilter || assetStatus) && (
              <button onClick={clearFilters} className="ml-2 text-forest-600 hover:underline">
                清除筛选
              </button>
            )}
          </p>
        )}

        {loading && assets.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-24 text-ink-400">
            <Loader2 size={16} className="animate-spin" />
            加载中…
          </div>
        ) : assets.length > 0 ? (
          <motion.div layout className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            <AnimatePresence mode="popLayout">
              {assets.map((a, i) => (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.3) }}
                >
                  <AssetCard
                    asset={a}
                    onOpen={openAsset}
                    selectable={selectMode}
                    selected={selectedIds.has(a.id)}
                    onToggleSelect={toggleSelect}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          emptyState
        )}
      </div>

      {/* 批量操作浮条 */}
      <AnimatePresence>
        {selectMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
          >
            <div className="flex items-center gap-1 rounded-2xl bg-forest-950/92 px-3 py-2 shadow-float backdrop-blur">
              <span className="px-2 text-[12px] font-medium text-cream-100">
                已选 <span className="tabular font-semibold text-gold">{selectedIds.size}</span> 项
              </span>
              <span className="mx-1 h-4 w-px bg-white/15" />
              <button
                onClick={() => setBatchTagOpen(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] text-cream-100 transition-colors hover:bg-white/10"
              >
                <Tag size={12} />
                打标签
              </button>
              <button
                onClick={() => void batchGolden3s(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] text-cream-100 transition-colors hover:bg-white/10"
              >
                <Sparkles size={12} />
                黄金3秒
              </button>
              <span className="mx-1 h-4 w-px bg-white/15" />
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] text-[#f2a08c] transition-colors hover:bg-white/10"
              >
                <Trash2 size={12} />
                删除
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 批量打标 */}
      <BatchTagModal
        assetIds={selectedAssets.map((a) => a.id)}
        assetCodes={selectedAssets.map((a) => a.code)}
        open={batchTagOpen}
        onClose={() => setBatchTagOpen(false)}
        onDone={exitSelectMode}
      />

      {/* 批量删除确认 */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="fade-in absolute inset-0 bg-forest-950/40 backdrop-blur-[2px]"
              onClick={() => setConfirmDelete(false)}
            />
            <div className="rise-in relative w-96 rounded-2xl bg-cream-50 p-5 shadow-float">
              <h3 className="text-[14px] font-semibold text-ink-900">确认批量删除？</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-400">
                将删除选中的 <span className="font-semibold text-alert">{selectedIds.size}</span> 个素材
                （含磁盘文件与缩略图），引用关系同步移除，不可恢复。
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-4 py-2 text-[12.5px] text-ink-400 hover:bg-ink-900/5"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    void batchDelete();
                    setConfirmDelete(false);
                  }}
                  className="rounded-lg bg-alert px-5 py-2 text-[12.5px] font-medium text-cream-50 transition-all hover:opacity-90"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 text-[12px] text-ink-500">
      <span className="text-forest-600">{icon}</span>
      <span>{label}</span>
      <span className="tabular font-semibold text-ink-900">{value}</span>
    </div>
  );
}
