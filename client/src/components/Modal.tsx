/** 通用模态框：居中浮层 + 遮罩 + 入场动画 */
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, subtitle, children, width = 560 }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div
        className="fade-in absolute inset-0 bg-forest-950/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* 面板 */}
      <div
        className="rise-in relative flex max-h-[86vh] w-full flex-col overflow-hidden rounded-2xl bg-cream-50 shadow-float"
        style={{ maxWidth: width }}
      >
        <div className="flex items-start justify-between border-b border-ink-900/6 px-5 py-4">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[12px] text-ink-400">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-900/6 hover:text-ink-900"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
