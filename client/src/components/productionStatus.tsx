/** 成片状态定义与徽标（草稿 → 剪辑中 → 待发布 → 已发布） */

export const PRODUCTION_STATUSES = [
  { key: 'draft', label: '草稿' },
  { key: 'editing', label: '剪辑中' },
  { key: 'pending', label: '待发布' },
  { key: 'published', label: '已发布' },
] as const;

export type ProductionStatusKey = (typeof PRODUCTION_STATUSES)[number]['key'];

/** 状态徽标样式映射 */
const STATUS_STYLE: Record<ProductionStatusKey, { cls: string; dot: string }> = {
  draft: { cls: 'bg-ink-900/6 text-ink-500', dot: 'bg-ink-300' },
  editing: { cls: 'bg-info-soft text-info', dot: 'bg-info' },
  pending: { cls: 'bg-gold-soft text-gold-ink', dot: 'bg-gold' },
  published: { cls: 'bg-forest-100 text-forest-700', dot: 'bg-forest-600' },
};

export function statusLabel(key: string): string {
  return PRODUCTION_STATUSES.find((s) => s.key === key)?.label ?? key;
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status as ProductionStatusKey] ?? STATUS_STYLE.draft;
  return (
    <span
      className={`flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${s.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {statusLabel(status)}
    </span>
  );
}
