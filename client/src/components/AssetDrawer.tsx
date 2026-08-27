/** 素材详情抽屉：视频预览、基本信息、标签编辑、使用记录 */
import { useEffect, useState } from 'react';
import { Calendar, Eye, Film, Hash, Monitor, Sparkles, Trash2, X } from 'lucide-react';
import type { AssetDetail } from '../types';
import { api, formatDate, formatDuration, formatSize, thumbUrl, videoUrl } from '../api';
import { useStore } from '../store';
import { TagPicker } from './TagPicker';

export function AssetDrawer() {
  const { assetDrawerId, closeDrawer, bumpAssets, reloadCategories } = useStore();
  const [detail, setDetail] = useState<AssetDetail | null>(null);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!assetDrawerId) {
      setDetail(null);
      return;
    }
    void api.getAsset(assetDrawerId).then((d) => {
      setDetail(d);
      setTagIds(d.tags.map((t) => t.id));
    });
  }, [assetDrawerId]);

  // ESC 关闭抽屉
  useEffect(() => {
    if (!assetDrawerId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [assetDrawerId, closeDrawer]);

  if (!assetDrawerId || !detail) return null;

  const videoSrc = videoUrl(detail);
  const thumb = thumbUrl(detail);

  const saveTags = async () => {
    setSaving(true);
    try {
      const updated = await api.updateAsset(detail.id, { tagIds });
      setDetail(updated);
      setTagIds(updated.tags.map((t) => t.id));
      bumpAssets();
    } finally {
      setSaving(false);
    }
  };


  const remove = async () => {
    await api.deleteAsset(detail.id);
    bumpAssets();
    void reloadCategories();
    closeDrawer();
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩 */}
      <div className="fade-in absolute inset-0 overlay-mask-soft" onClick={closeDrawer} />
      {/* 抽屉面板 */}
      <div className="rise-in absolute top-0 right-0 flex h-full w-[520px] max-w-[92vw] flex-col bg-cream-50 shadow-drawer">
        {/* 头部 */}
        <div className="flex items-center gap-3 border-b border-ink-900/6 px-5 py-3.5">
          <span className="font-mono text-[12px] font-semibold text-forest-700">{detail.code}</span>
          <span className="truncate text-[13px] font-medium text-ink-900">{detail.filename}</span>
          <button
            onClick={closeDrawer}
            className="ml-auto rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-900/6 hover:text-ink-900"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* 视频预览 */}
          <div className="relative bg-forest-950">
            {thumb || videoSrc ? (
              <video
                key={videoSrc}
                src={videoSrc}
                poster={thumb ?? undefined}
                controls
                preload="metadata"
                className="aspect-video w-full bg-forest-950"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center text-ink-500">
                无法预览
              </div>
            )}
          </div>

          <div className="space-y-5 p-5">

            {/* 标签编辑 */}
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-ink-900">标签分类</p>
              <TagPicker selected={tagIds} onChange={setTagIds} compact />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setTagIds(detail.tags.map((t) => t.id));
                  }}
                  className="rounded-lg px-3 py-1.5 text-[12px] text-ink-400 transition-colors hover:bg-ink-900/5"
                >
                  重置
                </button>
                <button
                  onClick={() => void saveTags()}
                  disabled={saving}
                  className="rounded-lg bg-forest-700 px-4 py-1.5 text-[12px] font-medium text-cream-50 shadow-card transition-all hover:bg-forest-600 active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? '保存中…' : '保存标签'}
                </button>
              </div>
            </div>

            {/* 基本信息 */}
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-ink-900">基本信息</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-cream-200/50 p-3.5 text-[12px]">
                <InfoItem icon={<Hash size={12} />} label="文件大小" value={formatSize(detail.size)} />
                <InfoItem icon={<Monitor size={12} />} label="分辨率" value={detail.width && detail.height ? `${detail.width}×${detail.height}` : '--'} />
                <InfoItem icon={<Film size={12} />} label="时长" value={formatDuration(detail.duration)} />
                <InfoItem icon={<Film size={12} />} label="帧率" value={detail.fps ? `${detail.fps} fps` : '--'} />
                <InfoItem icon={<Calendar size={12} />} label="入库时间" value={formatDate(detail.created_at)} />
                <InfoItem icon={<Eye size={12} />} label="使用次数" value={`${detail.usageCount} 次`} />
              </div>
            </div>

            {/* 使用记录 */}
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-ink-900">
                使用记录
                <span className="ml-1.5 text-[11px] font-normal text-ink-300">
                  共 {detail.usageCount} 次
                </span>
              </p>
              {detail.usageRecords.length === 0 ? (
                <p className="rounded-xl border border-dashed border-ink-900/10 px-3 py-4 text-center text-[12px] text-ink-400">
                  尚未被任何成片使用
                </p>
              ) : (
                <div className="space-y-1.5">
                  {detail.usageRecords.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-2 rounded-lg bg-cream-200/50 px-3 py-2 text-[12px]"
                    >
                      <span className="font-mono text-[11px] text-forest-700">{r.production_code}</span>
                      <span className="truncate text-ink-700">{r.production_title}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-ink-400">
                        {formatDate(r.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between border-t border-ink-900/6 px-5 py-3">
          {confirmDelete ? (
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-alert">确认删除该素材？</span>
              <button
                onClick={() => void remove()}
                className="rounded-lg bg-alert px-3 py-1.5 font-medium text-cream-50 transition-all hover:opacity-90"
              >
                删除
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1.5 text-ink-400 hover:text-ink-900"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-ink-400 transition-colors hover:bg-alert-soft hover:text-alert"
            >
              <Trash2 size={13} />
              删除素材
            </button>
          )}
          <span className="ml-auto text-[11px] text-ink-300">
            原片仅保存在本地服务器，不上传云端
          </span>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-ink-500">
      <span className="text-ink-300">{icon}</span>
      <span className="shrink-0 text-ink-400">{label}</span>
      <span className="ml-auto tabular truncate font-medium text-ink-900">{value}</span>
    </div>
  );
}
