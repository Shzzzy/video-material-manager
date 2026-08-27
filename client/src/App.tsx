/** 应用根组件：认证门卫 + 布局 + 路由 + 全局浮层 */
import { Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { IconRail } from './components/layout/IconRail';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { AssetsPage } from './pages/AssetsPage';
import { ProductionsPage } from './pages/ProductionsPage';
import { UsagePage } from './pages/UsagePage';
import { TagsPage } from './pages/TagsPage';
import { JoinPage } from './pages/JoinPage';
import { UploadDialog } from './components/UploadDialog';
import { AssetDrawer } from './components/AssetDrawer';
import { ProductionDrawer } from './components/ProductionDrawer';
import { ThemeDialog } from './components/ThemeDialog';
import { AdminPanel } from './components/AdminPanel';
import { StoreProvider, useStore } from './store';
import { authToken } from './api';

/** 主界面（已认证） */
function Workspace() {
  return (
    <div className="flex h-full overflow-hidden bg-cream-100">
      {/* 最左：极窄图标导航栏（深色） */}
      <IconRail />
      {/* 主侧边栏（浅色） */}
      <Sidebar />
      {/* 右侧：顶栏 + 内容 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<AssetsPage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/productions" element={<ProductionsPage />} />
            <Route path="/usage" element={<UsagePage />} />
            <Route path="/tags" element={<TagsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function AppInner() {
  const { member } = useStore();
  const hasToken = authToken() !== null;

  // 有 token 但身份尚未校验完成
  if (!member && hasToken) {
    return (
      <div className="flex h-full items-center justify-center bg-cream-100">
        <div className="flex items-center gap-2 text-ink-400">
          <Loader2 size={16} className="animate-spin" />
          正在进入工作台…
        </div>
      </div>
    );
  }

  // 未登录 → 登录/注册页
  if (!member) return <JoinPage />;

  return (
    <>
      <Workspace />
      {/* 全局浮层 */}
      <UploadDialog />
      <AssetDrawer />
      <ProductionDrawer />
      <ThemeDialog />
      <AdminPanel />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  );
}
