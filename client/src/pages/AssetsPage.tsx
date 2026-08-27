/** 素材库页面：统计概览 + 网格 + 空状态 + 上传入口（布局组件由 App 全局渲染，此处只渲染内容） */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clapperboard, Film, FolderOpen, History, Loader2, Sparkles, UploadCloud } from 'lucide-react';
import type { Asset, OverviewStats } from '../types';
import { api, formatDuration } from '../api';
import { useStore } from '../store';
import { AssetCard } from '../components/AssetCard';

export function AssetsPage() {
  const {
    assetsVersion,
    setUploadOpen,
    openAsset,
    assetSearch,
    assetGolden3s,
    assetTagIds,
    setAssetSearch,
    setAssetGolden3s,
    setAssetTagIds,
  } = useStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OverviewStats | null>(null);

  const load = useCallback(
    async (search: string, golden3s: boolean, tagIds: number[]) => {
      setLoading(true);
      try {
        const data = await api.listAssets({
          search,
          golden3sOnly: golden3s,
          tagIds,
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

  // 素材数据变化（上传/删除/筛选/引用）时重新加载
  useEffect(() => {
    void load(assetSearch, assetGolden3s, assetTagIds);
    void api.overview().then(setStats);
  }, [assetsVersion, assetSearch, assetGolden3s, assetTagIds, load]);

  const hasFilter = assetSearch.trim() !== '' || assetGolden3s || assetTagIds.length > 0;

  const clearFilters = () => {
    setAssetSearch('');
    setAssetGolden3s(false);
    setAssetTagIds([]);
  };

  const emptyState = useMemo(() => {
    if (assets.length > 0) return null;
    return (
      <div className="rise-in flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-800 text-cream-100 shadow-float">
          <Film size={26} />
        </div>
        <h2 className="mt-5 text-[16px] font-semibold text-ink-900">
          {hasFilter ? '没有匹配的素材' : '先建立你的第一批素材索引'}
        </h2>
        <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-ink-400">
          {hasFilter
            ? '试试调整搜索关键词或筛选条件'
            : '上传或扫描一个包含视频的文件夹，系统会自动生成编号、指纹、缩略图和基础信息'}
        </p>
        {!hasFilter && (
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
  }, [assets.length, hasFilter, setUploadOpen]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* 统计概览条 */}
      {stats && assets.length > 0 && (
        <div className="sticky top-0 z-10 border-b border-ink-900/6 bg-cream-100/90 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-6">
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
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {/* 结果提示 */}
        {!loading && assets.length > 0 && (
          <p className="mb-3 text-[11.5px] text-ink-400">
            {total} 条结果
            {hasFilter && (
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
                  <AssetCard asset={a} onOpen={openAsset} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          emptyState
        )}
      </div>
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
