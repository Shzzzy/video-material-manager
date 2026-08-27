/** 标签管理页面：自定义分类维度与标签值（拍摄人员/场景/景别/剪辑人员…） */
import { useState } from 'react';
import { Layers, Plus, Trash2, X } from 'lucide-react';
import type { Category } from '../types';
import { api } from '../api';
import { useStore } from '../store';
import { Modal } from '../components/Modal';

const PRESET_COLORS = ['#255C45', '#8a6a1d', '#7b5ea7', '#c25e4a', '#2d6a8f', '#a05e2c', '#5e7f2c', '#8f2c6a'];

export function TagsPage() {
  const { categories, reloadCategories } = useStore();
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [addingTagFor, setAddingTagFor] = useState<number | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [renaming, setRenaming] = useState<{ type: 'category' | 'tag'; id: number } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const createCategory = async () => {
    if (!newCatName.trim()) return;
    await api.createCategory(newCatName.trim());
    setNewCatOpen(false);
    setNewCatName('');
    void reloadCategories();
  };

  const removeCategory = async (c: Category) => {
    if (!confirm(`确认删除分类「${c.name}」？其下所有标签与素材关联将一并删除。`)) return;
    await api.deleteCategory(c.id);
    void reloadCategories();
  };

  const createTag = async (categoryId: number) => {
    if (!newTagName.trim()) return;
    const color = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    await api.createTag(categoryId, newTagName.trim(), color);
    setAddingTagFor(null);
    setNewTagName('');
    void reloadCategories();
  };

  const removeTag = async (tagId: number, tagName: string) => {
    if (!confirm(`确认删除标签「${tagName}」？`)) return;
    await api.deleteTag(tagId);
    void reloadCategories();
  };

  const submitRename = async () => {
    if (!renaming || !renameValue.trim()) return;
    if (renaming.type === 'category') await api.renameCategory(renaming.id, renameValue.trim());
    else await api.renameTag(renaming.id, renameValue.trim());
    setRenaming(null);
    void reloadCategories();
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {/* 头部 */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex-1">
          <h2 className="text-[15px] font-semibold text-ink-900">分类标签</h2>
          <p className="mt-0.5 text-[12px] text-ink-400">
            自定义分类维度（如：拍摄人员、场景、景别、剪辑人员），素材可打多个标签；AI 分类配置后将自动打标
          </p>
        </div>
        <button
          onClick={() => setNewCatOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-forest-700 px-4 py-2 text-[12.5px] font-medium text-cream-50 shadow-card transition-all hover:bg-forest-600 active:scale-[0.98]"
        >
          <Plus size={14} />
          新建分类维度
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-900/10 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-800 text-cream-100">
            <Layers size={22} />
          </div>
          <h2 className="mt-4 text-[15px] font-semibold text-ink-900">还没有分类维度</h2>
          <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-ink-400">
            先创建「拍摄人员」「场景」「景别」「剪辑人员」等维度，再为每个维度添加标签值
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {categories.map((cat, i) => (
            <div key={cat.id} className="card-lift rise-in rounded-xl bg-cream-50 p-4 shadow-card hairline" style={{ animationDelay: `${i * 40}ms` }}>
              {/* 维度头 */}
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-forest-800 text-[12px] font-bold text-cream-100">
                  {cat.name.slice(0, 1)}
                </span>
                <h3 className="text-[13.5px] font-semibold text-ink-900">{cat.name}</h3>
                <span className="text-[11px] text-ink-300">{cat.tags.length} 个标签</span>
                <div className="ml-auto flex gap-1">
                  <button
                    onClick={() => {
                      setRenaming({ type: 'category', id: cat.id });
                      setRenameValue(cat.name);
                    }}
                    className="rounded-md px-2 py-1 text-[11px] text-ink-400 hover:bg-ink-900/5 hover:text-ink-700"
                  >
                    重命名
                  </button>
                  <button
                    onClick={() => void removeCategory(cat)}
                    className="rounded-md p-1 text-ink-300 hover:bg-alert-soft hover:text-alert"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* 标签列表 */}
              <div className="flex flex-wrap gap-1.5">
                {cat.tags.map((t) => (
                  <span
                    key={t.id}
                    className="group flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium"
                    style={{ background: `${t.color}1c`, color: t.color }}
                  >
                    {t.name}
                    <button
                      onClick={() => {
                        setRenaming({ type: 'tag', id: t.id });
                        setRenameValue(t.name);
                      }}
                      className="rounded p-px opacity-40 transition-opacity hover:opacity-100"
                      title="重命名"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => void removeTag(t.id, t.name)}
                      className="rounded p-px opacity-40 transition-opacity hover:opacity-100"
                      title="删除"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
                {cat.tags.length === 0 && (
                  <span className="text-[11.5px] text-ink-300">暂无标签值</span>
                )}
              </div>

              {/* 添加标签 */}
              {addingTagFor === cat.id ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    autoFocus
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void createTag(cat.id)}
                    placeholder="输入标签名，回车确认"
                    className="h-8 flex-1 rounded-lg border border-ink-900/8 bg-cream-200/60 px-3 text-[12.5px] outline-none focus:border-forest-500/50 focus:ring-2 focus:ring-forest-500/15"
                  />
                  <button
                    onClick={() => void createTag(cat.id)}
                    disabled={!newTagName.trim()}
                    className="rounded-lg bg-forest-700 px-3 py-1.5 text-[12px] font-medium text-cream-50 disabled:opacity-40"
                  >
                    添加
                  </button>
                  <button
                    onClick={() => setAddingTagFor(null)}
                    className="px-2 py-1.5 text-ink-400 hover:text-ink-900"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingTagFor(cat.id)}
                  className="mt-3 flex items-center gap-1 text-[12px] text-forest-700 transition-colors hover:text-forest-500"
                >
                  <Plus size={12} />
                  添加标签
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 新建分类维度 */}
      <Modal open={newCatOpen} onClose={() => setNewCatOpen(false)} title="新建分类维度" subtitle="例如：拍摄人员、场景、景别、剪辑人员" width={420}>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-ink-700">维度名称</label>
            <input
              autoFocus
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void createCategory()}
              placeholder="例如：拍摄人员"
              className="h-9 w-full rounded-lg border border-ink-900/8 bg-cream-200/60 px-3 text-[13px] outline-none focus:border-forest-500/50 focus:ring-2 focus:ring-forest-500/15"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setNewCatOpen(false)} className="rounded-lg px-4 py-2 text-[12.5px] text-ink-400 hover:bg-ink-900/5">
              取消
            </button>
            <button
              onClick={() => void createCategory()}
              disabled={!newCatName.trim()}
              className="rounded-lg bg-forest-700 px-5 py-2 text-[12.5px] font-medium text-cream-50 shadow-card transition-all hover:bg-forest-600 active:scale-[0.98] disabled:opacity-40"
            >
              创建
            </button>
          </div>
        </div>
      </Modal>

      {/* 重命名 */}
      <Modal open={renaming !== null} onClose={() => setRenaming(null)} title={`重命名${renaming?.type === 'category' ? '分类维度' : '标签'}`} width={400}>
        <div className="space-y-4 p-5">
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void submitRename()}
            className="h-9 w-full rounded-lg border border-ink-900/8 bg-cream-200/60 px-3 text-[13px] outline-none focus:border-forest-500/50 focus:ring-2 focus:ring-forest-500/15"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setRenaming(null)} className="rounded-lg px-4 py-2 text-[12.5px] text-ink-400 hover:bg-ink-900/5">
              取消
            </button>
            <button
              onClick={() => void submitRename()}
              disabled={!renameValue.trim()}
              className="rounded-lg bg-forest-700 px-5 py-2 text-[12.5px] font-medium text-cream-50 shadow-card transition-all hover:bg-forest-600 active:scale-[0.98] disabled:opacity-40"
            >
              保存
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
