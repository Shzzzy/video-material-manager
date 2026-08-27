/** 团队同步页面：占位（设计稿标注「第二阶段」） */
import { Users } from 'lucide-react';

export function TeamPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-800 text-cream-100 shadow-float">
        <Users size={26} />
      </div>
      <h2 className="mt-5 text-[16px] font-semibold text-ink-900">团队同步 · 第二阶段</h2>
      <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-ink-400">
        即将开放：团队成员共享素材库、同步标签体系与使用记录。
        <br />
        当前版本为本地单机版，原片保存在本机，不会上传云端。
      </p>
      <span className="mt-6 rounded-full border border-gold/40 bg-gold-soft px-4 py-1.5 text-[12px] font-medium text-[#8a6a1d]">
        即将开放
      </span>
    </div>
  );
}
