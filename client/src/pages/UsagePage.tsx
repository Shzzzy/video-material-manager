/** 使用记录页面：素材被引用的事件流（时间倒序） */
import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import type { UsageLog } from '../types';
import { api, formatDate, thumbUrl } from '../api';
import { useStore } from '../store';

export function UsagePage() {
  const { assetsVersion, openAsset, openProduction } = useStore();
  const [logs, setLogs] = useState<UsageLog[]>([]);

  useEffect(() => {
    void api.usageLog().then(setLogs);
  }, [assetsVersion]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold text-ink-900">使用记录</h2>
        <p className="mt-0.5 text-[12px] text-ink-400">
          素材被成片引用的每一次记录，点击可查看详情
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-900/10 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-800 text-cream-100">
            <History size={22} />
          </div>
          <h2 className="mt-4 text-[15px] font-semibold text-ink-900">暂无使用记录</h2>
          <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-ink-400">
            在成片库中创建成片并引用素材后，这里会展示每次引用的时间与素材
          </p>
        </div>
      ) : (
        <div className="relative space-y-0 pl-6">
          {/* 时间轴竖线 */}
          <div className="absolute top-2 bottom-2 left-[7px] w-px bg-ink-900/8" />
          {logs.map((l, i) => {
            const thumb = thumbUrl(l);
            return (
              <div key={l.id} className="rise-in relative pb-4 pl-6" style={{ animationDelay: `${Math.min(i * 25, 300)}ms` }}>
                {/* 时间轴节点 */}
                <span className="absolute top-1.5 -left-6 h-3.5 w-3.5 rounded-full border-2 border-cream-100 bg-forest-600" />
                <div className="card-lift flex items-center gap-3 rounded-xl bg-cream-50 p-3 shadow-card hairline">
                  <button
                    onClick={() => openAsset(l.asset_id)}
                    className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-forest-950"
                  >
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[9px] text-forest-300/50">NO THUMB</span>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-forest-700">{l.asset_code}</span>
                      <span className="truncate text-[12.5px] font-medium text-ink-900">{l.filename}</span>
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-ink-400">
                      被用于{' '}
                      <button
                        onClick={() => openProduction(l.production_id)}
                        className="font-medium text-forest-700 hover:underline"
                      >
                        {l.production_title}
                      </button>
                      <span className="ml-1 font-mono text-[10.5px] text-ink-300">({l.production_code})</span>
                      {l.note && <span className="ml-1.5 text-ink-500">· {l.note}</span>}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-ink-400">{formatDate(l.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
