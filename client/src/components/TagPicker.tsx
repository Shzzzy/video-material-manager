/** 标签选择器：按分类维度分组展示，支持多选（用于素材打标与筛选） */
import { Check } from 'lucide-react';
import { useStore } from '../store';

interface TagPickerProps {
  selected: number[];
  onChange: (ids: number[]) => void;
  /** 紧凑模式（抽屉内使用） */
  compact?: boolean;
}

export function TagPicker({ selected, onChange, compact }: TagPickerProps) {
  const { categories } = useStore();

  const toggle = (tagId: number) => {
    onChange(selected.includes(tagId) ? selected.filter((t) => t !== tagId) : [...selected, tagId]);
  };

  return (
    <div className={`space-y-3 ${compact ? '' : 'max-h-72 overflow-y-auto pr-1'}`}>
      {categories.length === 0 && (
        <p className="rounded-lg border border-dashed border-ink-900/10 px-3 py-3 text-[12px] text-ink-400">
          还没有分类标签，请先到「标签管理」创建（例如：拍摄人员、场景、景别）。
        </p>
      )}
      {categories.map((cat) => (
        <div key={cat.id}>
          <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-ink-400 uppercase">
            {cat.name}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {cat.tags.map((t) => {
              const active = selected.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggle(t.id)}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[12px] transition-all duration-150 ${
                    active
                      ? 'border-transparent font-medium text-cream-50 shadow-card'
                      : 'border-ink-900/10 bg-cream-200/50 text-ink-600 hover:border-ink-900/20'
                  }`}
                  style={active ? { background: t.color } : undefined}
                >
                  {active && <Check size={11} />}
                  {t.name}
                </button>
              );
            })}
            {cat.tags.length === 0 && (
              <span className="text-[11px] text-ink-300">暂无标签</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
