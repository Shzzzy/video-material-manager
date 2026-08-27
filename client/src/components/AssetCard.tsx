/** 素材卡片：缩略图 + 编号 + 时长 + 标签 + 使用次数 + 快速打标（网格单元） */
import { memo, useState } from 'react';
import { AlertTriangle, Eye, Play, Sparkles, Tags } from 'lucide-react';
import type { Asset } from '../types';
import { api, formatDuration, formatSize, thumbUrl } from '../api';
import { useStore } from '../store';
import { TagPicker } from './TagPicker';

interface AssetCardProps {
  asset: Asset;
  onOpen: (id: number) => void;
  /** 成片库选择素材模式：点击打勾 */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: number) => void;
}

export const AssetCard = memo(function AssetCard({
  asset,
  onOpen,
  selectable,
  selected,
  onToggleSelect,
}: AssetCardProps) {
  const { bumpAssets } = useStore();
  const [tagOpen, setTagOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const thumb = thumbUrl(asset);

  const handleClick = () => {
    if (tagOpen) return; // 打标浮层打开时不触发卡片点击
    if (selectable) onToggleSelect?.(asset.id);
    else onOpen(asset.id);
  };

  /** 快速打标：点击标签即保存 */
  const saveTags = async (tagIds: number[]) => {
    if (saving) return;
    setSaving(true);
    try {
      await api.updateAsset(asset.id, { tagIds });
      bumpAssets(); // 刷新列表，卡片标签同步
    } catch {
      /* 保存失败保持原状 */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      {/* 卡片本体（overflow-hidden 保证圆角裁剪，浮层定位在外层不受裁剪） */}
      <div
        onClick={handleClick}
        className={`card-lift group relative cursor-pointer overflow-hidden rounded-xl bg-cream-50 shadow-card ${
          selectable && selected ? 'ring-2 ring-forest-600' : 'hairline'
        }`}
      >
      {/* 缩略图区 */}
      <div className="relative aspect-video overflow-hidden bg-forest-950">
        {thumb ? (
          <img
            src={thumb}
            alt={asset.filename}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-forest-800 to-forest-950">
            <Play size={22} className="text-forest-300/60" />
          </div>
        )}

        {/* 遮罩（hover 显示播放提示） */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-forest-950/0 opacity-0 transition-all duration-200 group-hover:bg-forest-950/25 group-hover:opacity-100">
          <div className="flex h-9 w-9 scale-75 items-center justify-center rounded-full bg-cream-50/90 text-forest-800 shadow-card transition-transform duration-200 group-hover:scale-100">
            <Play size={14} className="ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* 左上：编号 */}
        <span className="absolute top-2 left-2 rounded-md bg-forest-950/70 px-1.5 py-0.5 font-mono text-[10.5px] font-medium tracking-wide text-cream-100 backdrop-blur-sm">
          {asset.code}
        </span>

        {/* 右上：黄金3秒 */}
        {asset.golden3s === 1 && (
          <span className="absolute top-2 right-2 flex items-center gap-0.5 rounded-md bg-gold px-1.5 py-0.5 text-[10px] font-semibold text-[#5c4708] shadow-card">
            <Sparkles size={9} />
            黄金3秒
          </span>
        )}

        {/* 右下：时长 */}
        {asset.duration != null && (
          <span className="absolute right-2 bottom-2 rounded-md bg-forest-950/70 px-1.5 py-0.5 tabular text-[10.5px] text-cream-100 backdrop-blur-sm">
            {formatDuration(asset.duration)}
          </span>
        )}
      </div>

      {/* 信息区 */}
      <div className="px-2.5 py-2">
        <div className="flex items-center gap-1">
          <p className="truncate text-[12px] font-medium text-ink-900" title={asset.filename}>
            {asset.filename}
          </p>
          {/* 快速打标按钮（hover 出现） */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setTagOpen((v) => !v);
            }}
            className={`ml-auto flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-all ${
              tagOpen
                ? 'bg-forest-600 text-cream-50'
                : 'bg-ink-900/4 text-ink-400 opacity-0 hover:bg-forest-100 hover:text-forest-700 group-hover:opacity-100'
            }`}
            title="快速打标签"
          >
            <Tags size={10} />
            {saving ? '…' : '标签'}
          </button>
        </div>

        {/* 标签行 */}
        <div className="mt-1.5 flex min-h-[18px] flex-wrap gap-1">
          {asset.tags.slice(0, 3).map((t) => (
            <span
              key={t.id}
              className="rounded px-1.5 py-px text-[10px] font-medium"
              style={{ background: `${t.color}1f`, color: t.color }}
            >
              {t.name}
            </span>
          ))}
          {asset.tags.length > 3 && (
            <span className="text-[10px] text-ink-300">+{asset.tags.length - 3}</span>
          )}
          {asset.tags.length === 0 && (
            <span className="text-[10px] text-ink-300">未打标签</span>
          )}
        </div>

        {/* 底部元信息 */}
        <div className="mt-1.5 flex items-center gap-2 text-[10.5px] text-ink-300">
          <span className="tabular">{formatSize(asset.size)}</span>
          {asset.width && asset.height && (
            <span className="tabular">
              {asset.width}×{asset.height}
            </span>
          )}
          <span className="ml-auto flex items-center gap-0.5">
            <Eye size={10} />
            <span className="tabular">{asset.usageCount}</span>
          </span>
        </div>
      </div>

      {/* 选择模式勾选 */}
      {selectable && (
        <div
          className={`absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-md border text-[11px] transition-all ${
            selected
              ? 'border-forest-600 bg-forest-600 text-cream-50'
              : 'border-cream-50/80 bg-forest-950/40 text-transparent'
          }`}
        >
          ✓
        </div>
      )}
      </div>
      {/* 卡片本体结束 */}

      {/* 快速打标浮层（在卡片本体外，避免被 overflow-hidden 裁剪） */}
      {tagOpen && (
        <>
          {/* 透明遮罩：点击外部关闭 */}
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setTagOpen(false);
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="rise-in absolute top-10 right-0 z-50 w-64 rounded-xl border border-ink-900/8 bg-cream-50 p-3 shadow-float"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1 text-[11.5px] font-semibold text-ink-900">
                <Tags size={11} className="text-forest-600" />
                打标签 · {asset.code}
              </span>
              <button
                onClick={() => setTagOpen(false)}
                className="rounded p-0.5 text-ink-300 hover:bg-ink-900/5 hover:text-ink-700"
              >
                ✕
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto pr-0.5">
              <TagPicker
                selected={asset.tags.map((t) => t.id)}
                onChange={(ids) => void saveTags(ids)}
                compact
              />
            </div>
            <p className="mt-2 flex items-center gap-1 border-t border-ink-900/6 pt-2 text-[10px] text-ink-300">
              <AlertTriangle size={9} className="shrink-0" />
              点击标签即保存；更多设置请打开素材详情
            </p>
          </div>
        </>
      )}
      {/* 外层包裹结束 */}
    </div>
  );
});

