/** 全局类型定义（与后端数据结构对应） */

export interface Category {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
  tags: Tag[];
}

export interface Tag {
  id: number;
  category_id: number;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

/** 素材上的标签（含所属分类） */
export interface AssetTag {
  id: number;
  name: string;
  color: string;
  category: { id: number; name: string };
}

export interface Asset {
  id: number;
  code: string;
  filename: string;
  file_path: string;
  size: number;
  duration: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  sha256: string | null;
  thumbnail_path: string | null;
  golden3s: number;
  source: string;
  created_at: string;
  updated_at: string;
  tags: AssetTag[];
  usageCount: number;
}

export interface AssetDetail extends Asset {
  usageRecords: UsageRecord[];
}

export interface UsageRecord {
  id: number;
  note: string | null;
  created_at: string;
  production_id: number;
  production_code: string;
  production_title: string;
}

export interface Production {
  id: number;
  code: string;
  title: string;
  cover_path: string | null;
  duration: number | null;
  description: string | null;
  publish_status: string;
  created_at: string;
  updated_at: string;
  assetCount: number;
}

export interface ProductionDetail extends Production {
  assets: Array<{
    relation_id: number;
    note: string | null;
    used_at: string;
    id: number;
    code: string;
    filename: string;
    duration: number | null;
    thumbnail_path: string | null;
  }>;
}

export interface OverviewStats {
  assetTotal: number;
  productionTotal: number;
  usedCount: number;
  usageTotal: number;
  golden3sCount: number;
  totalDuration: number;
  pendingCount: number;
}

export interface AdapterStatus {
  name: 'ai-vision' | 'publish' | 'ai-video';
  configured: boolean;
  enabled: boolean;
  description: string;
  pendingDoc: boolean;
}

export interface UsageLog {
  id: number;
  note: string | null;
  created_at: string;
  asset_id: number;
  asset_code: string;
  filename: string;
  thumbnail_path: string | null;
  production_id: number;
  production_code: string;
  production_title: string;
}
