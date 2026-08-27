/** 批量打标对话框：对选中素材统一设置标签（整体替换） */
import { useState } from 'react';
import { TagPicker } from './TagPicker';
import { Modal } from './Modal';
import { useStore } from '../store';
import { api } from '../api';

interface BatchTagModalProps {
  /** 素材 id 集合 */
  assetIds: number[];
  /** 素材代号（展示用） */
  assetCodes: string[];
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

export function BatchTagModal({ assetIds, assetCodes, open, onClose, onDone }: BatchTagModalProps) {
  const { bumpAssets, reloadCategories } = useStore();
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (assetIds.length === 0 || saving) return;
    setSaving(true);
    try {
      await api.batchSetTags(assetIds, tagIds);
      bumpAssets();
      void reloadCategories();
      onDone();
      onClose();
    } catch {
      /* 保存失败保持打开 */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`批量打标签 · ${assetIds.length} 个素材`}
      subtitle="以下素材的标签将被统一替换为所选标签"
      width={520}
    >
      <div className="space-y-4 p-5">
        {/* 素材清单预览 */}
        <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
          {assetCodes.slice(0, 12).map((c, i) => (
            <span key={i} className="rounded-md bg-forest-100 px-1.5 py-0.5 font-mono text-[11px] text-forest-700">
              {c}
            </span>
          ))}
          {assetCodes.length > 12 && (
            <span className="text-[11px] text-ink-300">+{assetCodes.length - 12}</span>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto rounded-xl bg-cream-200/40 p-3">
          <TagPicker selected={tagIds} onChange={setTagIds} />
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setTagIds([])}
            className="rounded-lg px-3 py-2 text-[12px] text-ink-400 hover:bg-ink-900/5"
          >
            清空选择
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-[12.5px] text-ink-400 hover:bg-ink-900/5"
            >
              取消
            </button>
            <button
              onClick={() => void save()}
              disabled={saving}
              className="rounded-lg bg-forest-700 px-5 py-2 text-[12.5px] font-medium text-cream-50 shadow-card transition-all hover:bg-forest-600 active:scale-[0.98] disabled:opacity-40"
            >
              {saving ? '保存中…' : '应用到全部素材'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
