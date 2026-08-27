/** 全局轻量状态：分类数据、适配器状态、UI 开关（对话框/抽屉） */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import type { AdapterStatus, Category } from './types';

interface StoreState {
  categories: Category[];
  adapters: AdapterStatus[];
  /** 上传/扫描对话框 */
  uploadOpen: boolean;
  /** 素材详情抽屉 */
  assetDrawerId: number | null;
  /** 成片详情抽屉 */
  productionDrawerId: number | null;
  /** 刷新素材列表的计数器（+1 触发重新拉取） */
  assetsVersion: number;
  reloadCategories: () => Promise<void>;
  reloadAdapters: () => Promise<void>;
  setUploadOpen: (v: boolean) => void;
  openAsset: (id: number) => void;
  openProduction: (id: number) => void;
  closeDrawer: () => void;
  bumpAssets: () => void;
}

const StoreCtx = createContext<StoreState | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [adapters, setAdapters] = useState<AdapterStatus[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [assetDrawerId, setAssetDrawerId] = useState<number | null>(null);
  const [productionDrawerId, setProductionDrawerId] = useState<number | null>(null);
  const [assetsVersion, setAssetsVersion] = useState(0);

  const reloadCategories = useCallback(async () => {
    try {
      setCategories(await api.listCategories());
    } catch {
      /* 静默失败，页面会显示空 */
    }
  }, []);

  const reloadAdapters = useCallback(async () => {
    try {
      setAdapters(await api.adapters());
    } catch {
      /* 静默 */
    }
  }, []);

  useEffect(() => {
    void reloadCategories();
    void reloadAdapters();
  }, [reloadCategories, reloadAdapters]);

  const bumpAssets = useCallback(() => setAssetsVersion((v) => v + 1), []);

  return (
    <StoreCtx.Provider
      value={{
        categories,
        adapters,
        uploadOpen,
        assetDrawerId,
        productionDrawerId,
        assetsVersion,
        reloadCategories,
        reloadAdapters,
        setUploadOpen,
        openAsset: setAssetDrawerId,
        openProduction: setProductionDrawerId,
        closeDrawer: () => {
          setAssetDrawerId(null);
          setProductionDrawerId(null);
        },
        bumpAssets,
      }}
    >
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore(): StoreState {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore 必须在 StoreProvider 内使用');
  return ctx;
}
