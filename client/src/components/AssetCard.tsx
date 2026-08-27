/** 素材卡片：缩略图 + 编号 + 时长 + 标签 + 使用次数（网格单元） */
import { memo } from 'react';
import { Eye, Play, Sparkles } from 'lucide-react';
import type { Asset } from '../types';
import { formatDuration, formatSize, thumbUrl, videoUrl } from '../api';

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
  const thumb = thumbUrl(asset);

  const handleClick = () => {
    if (selectable) onToggleSelect?.(asset.id);
    else onOpen(asset.id);
  };

  return (
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
        <div className="absolute inset-0 flex items-center justify-center bg-forest-950/0 opacity-0 transition-all duration-200 group-hover:bg-forest-950/25 group-hover:opacity-100">
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
        <p className="truncate text-[12px] font-medium text-ink-900" title={asset.filename}>
          {asset.filename}
        </p>

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
  );
});

export { videoUrl };
