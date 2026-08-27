/** 全局轻量状态：分类数据、适配器状态、UI 开关（对话框/抽屉）、素材库筛选 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';
import { applyTheme, AUTO_THEME, DEFAULT_THEME, loadTheme, saveTheme } from './themes';
import type { AdapterStatus, Category } from './types';

interface StoreState {
  categories: Category[];
  adapters: AdapterStatus[];
  /** 主题偏好：具体主题 id 或 'auto'（自动跟随时间） */
  theme: string;
  /** 主题切换面板 */
  themeDialogOpen: boolean;
  setTheme: (id: string) => void;
  setThemeDialogOpen: (v: boolean) => void;
  /** 上传/扫描对话框 */
  uploadOpen: boolean;
  /** 素材详情抽屉 */
  assetDrawerId: number | null;
  /** 成片详情抽屉 */
  productionDrawerId: number | null;
  /** 刷新素材列表的计数器（+1 触发重新拉取） */
  assetsVersion: number;
  /** 素材库筛选状态（顶栏与侧边栏共用，避免重复渲染） */
  assetSearch: string;
  assetTagIds: number[];
  /** 素材状态筛选：null 全部 / new 待标注 / organized 已整理 / used 已使用 */
  assetStatus: 'new' | 'organized' | 'used' | null;
  setAssetSearch: (v: string) => void;
  setAssetTagIds: (v: number[]) => void;
  setAssetStatus: (v: 'new' | 'organized' | 'used' | null) => void;
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
  const [theme, setThemeState] = useState<string>(() => loadTheme());
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [assetDrawerId, setAssetDrawerId] = useState<number | null>(null);
  const [productionDrawerId, setProductionDrawerId] = useState<number | null>(null);
  const [assetsVersion, setAssetsVersion] = useState(0);
  const [assetSearch, setAssetSearchState] = useState('');
  const [assetTagIds, setAssetTagIdsState] = useState<number[]>([]);
  const [assetStatus, setAssetStatusState] = useState<'new' | 'organized' | 'used' | null>(null);
  /** 搜索防抖：停止输入 300ms 后触发刷新 */
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bumpAssets = useCallback(() => setAssetsVersion((v) => v + 1), []);

  const setAssetSearch = useCallback(
    (v: string) => {
      setAssetSearchState(v);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(bumpAssets, 300);
    },
    [bumpAssets],
  );


  const setAssetTagIds = useCallback(
    (v: number[]) => {
      setAssetTagIdsState(v);
      bumpAssets();
    },
    [bumpAssets],
  );

  const setAssetStatus = useCallback(
    (v: 'new' | 'organized' | 'used' | null) => {
      setAssetStatusState(v);
      bumpAssets();
    },
    [bumpAssets],
  );

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

  // 主题应用：挂载时恢复持久化主题
  const setTheme = useCallback((pref: string) => {
    setThemeState(pref);
    applyTheme(pref);
    saveTheme(pref);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自动跟随时间：每分钟检查一次，时段变化时自动切换主题
  useEffect(() => {
    if (theme !== AUTO_THEME) return;
    const timer = setInterval(() => {
      applyTheme(AUTO_THEME);
    }, 60_000);
    return () => clearInterval(timer);
  }, [theme]);

  // 首次进入 auto 时立即应用当前时段
  useEffect(() => {
    if (theme === AUTO_THEME) applyTheme(AUTO_THEME);
  }, [theme]);

  return (
    <StoreCtx.Provider
      value={{
        categories,
        adapters,
        theme,
        themeDialogOpen,
        setTheme,
        setThemeDialogOpen,
        uploadOpen,
        assetDrawerId,
        productionDrawerId,
        assetsVersion,
        assetSearch,
        assetTagIds,
        assetStatus,
        setAssetSearch,
        setAssetTagIds,
        setAssetStatus,
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
