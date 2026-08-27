/** API 客户端：统一封装 fetch 与错误处理 */
import type {
  Asset,
  AssetDetail,
  Category,
  Production,
  ProductionDetail,
  OverviewStats,
  AdapterStatus,
  UsageLog,
  Tag,
} from './types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let message = `请求失败（${res.status}）`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* 忽略解析失败 */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // ---- 素材 ----
  listAssets: (params: {
    search?: string;
    tagIds?: number[];
    golden3sOnly?: boolean;
    status?: 'new' | 'organized' | 'used';
    page?: number;
    pageSize?: number;
  }) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.tagIds?.length) q.set('tagIds', params.tagIds.join(','));
    if (params.golden3sOnly) q.set('golden3s', '1');
    if (params.status) q.set('status', params.status);
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    const qs = q.toString();
    return request<{ items: Asset[]; total: number }>(`/api/assets${qs ? `?${qs}` : ''}`);
  },

  getAsset: (id: number) => request<AssetDetail>(`/api/assets/${id}`),

  updateAsset: (id: number, patch: { tagIds?: number[]; golden3s?: boolean }) =>
    request<AssetDetail>(`/api/assets/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  deleteAsset: (id: number) =>
    request<{ ok: boolean }>(`/api/assets/${id}`, { method: 'DELETE' }),

  // ---- 批量操作 ----
  batchSetTags: (assetIds: number[], tagIds: number[]) =>
    request<{ ok: boolean; affected: number }>('/api/assets/batch/tags', {
      method: 'POST',
      body: JSON.stringify({ assetIds, tagIds }),
    }),

  batchSetGolden3s: (assetIds: number[], golden3s: boolean) =>
    request<{ ok: boolean; affected: number }>('/api/assets/batch/golden3s', {
      method: 'POST',
      body: JSON.stringify({ assetIds, golden3s }),
    }),

  batchDeleteAssets: (assetIds: number[]) =>
    request<{ ok: boolean; removed: number }>('/api/assets/batch/delete', {
      method: 'POST',
      body: JSON.stringify({ assetIds }),
    }),

  /** 上传素材（XHR 带进度回调）；duplicated=true 表示内容与已有素材重复（指纹命中） */
  uploadAssets: (files: File[], onProgress: (done: number, total: number) => void) =>
    new Promise<{
      results: Array<{ filename: string; asset?: Asset; duplicated?: boolean; error?: string }>;
    }>((resolve, reject) => {
        const form = new FormData();
        for (const f of files) form.append('files', f);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/assets/upload');
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(e.loaded, e.total);
        };
        xhr.onload = () => {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error('上传响应解析失败'));
          }
        };
        xhr.onerror = () => reject(new Error('上传失败，请检查网络'));
        xhr.send(form);
      },
    ),

  // ---- 分类与标签 ----
  listCategories: () => request<Category[]>('/api/categories'),

  createCategory: (name: string) =>
    request<Category>('/api/categories', { method: 'POST', body: JSON.stringify({ name }) }),

  renameCategory: (id: number, name: string) =>
    request<Category>(`/api/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  deleteCategory: (id: number) =>
    request<{ ok: boolean }>(`/api/categories/${id}`, { method: 'DELETE' }),

  createTag: (categoryId: number, name: string, color?: string) =>
    request<Tag>('/api/categories/tags', {
      method: 'POST',
      body: JSON.stringify({ categoryId, name, color }),
    }),

  renameTag: (id: number, name: string) =>
    request<Tag>(`/api/categories/tags/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),

  deleteTag: (id: number) =>
    request<{ ok: boolean }>(`/api/categories/tags/${id}`, { method: 'DELETE' }),

  // ---- 成片 ----
  listProductions: (search?: string) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<Production[]>(`/api/productions${qs}`);
  },

  createProduction: (data: { title: string; duration?: number | null; description?: string }) =>
    request<Production>('/api/productions', { method: 'POST', body: JSON.stringify(data) }),

  getProduction: (id: number) => request<ProductionDetail>(`/api/productions/${id}`),

  updateProduction: (
    id: number,
    data: Partial<{ title: string; duration: number | null; description: string; publishStatus: string }>,
  ) => request<Production>(`/api/productions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteProduction: (id: number) =>
    request<{ ok: boolean }>(`/api/productions/${id}`, { method: 'DELETE' }),

  addProductionAssets: (productionId: number, assetIds: number[], note?: string) =>
    request<{ added: number; message: string }>(`/api/productions/${productionId}/assets`, {
      method: 'POST',
      body: JSON.stringify({ assetIds, note }),
    }),

  removeProductionAsset: (productionId: number, relationId: number) =>
    request<{ ok: boolean }>(`/api/productions/${productionId}/assets/${relationId}`, {
      method: 'DELETE',
    }),

  // ---- 统计 ----
  overview: () => request<OverviewStats>('/api/stats/overview'),
  usageLog: (params?: { assetId?: number; productionId?: number }) => {
    const q = new URLSearchParams();
    if (params?.assetId) q.set('assetId', String(params.assetId));
    if (params?.productionId) q.set('productionId', String(params.productionId));
    const qs = q.toString();
    return request<UsageLog[]>(`/api/stats/usage${qs ? `?${qs}` : ''}`);
  },

  // ---- 适配器 ----
  adapters: () => request<AdapterStatus[]>('/api/adapters'),
};

/** 缩略图 URL（后端静态服务） */
export function thumbUrl(asset: { thumbnail_path: string | null }): string | null {
  return asset.thumbnail_path ? `/media/${asset.thumbnail_path}` : null;
}

/** 视频文件 URL */
export function videoUrl(asset: { file_path: string }): string {
  // file_path 形如 <DATA_DIR>/uploads/xxx.mp4，取相对部分
  const idx = asset.file_path.lastIndexOf('/uploads/');
  const rel = idx >= 0 ? asset.file_path.slice(idx + 1) : asset.file_path;
  return `/media/${rel}`;
}

/** 时长格式化：秒 → 00:00 或 00:00:00 */
export function formatDuration(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return '--:--';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** 文件大小格式化 */
export function formatSize(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** 日期格式化：YYYY-MM-DD HH:mm */
export function formatDate(iso: string): string {
  const d = new Date(iso.replace(' ', 'T'));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
