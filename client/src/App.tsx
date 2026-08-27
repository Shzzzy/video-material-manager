/** 应用根组件：布局 + 路由 + 全局浮层 */
import { Routes, Route } from 'react-router-dom';
import { IconRail } from './components/layout/IconRail';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { AssetsPage } from './pages/AssetsPage';
import { ProductionsPage } from './pages/ProductionsPage';
import { UsagePage } from './pages/UsagePage';
import { TagsPage } from './pages/TagsPage';
import { UploadDialog } from './components/UploadDialog';
import { AssetDrawer } from './components/AssetDrawer';
import { ProductionDrawer } from './components/ProductionDrawer';
import { ThemeDialog } from './components/ThemeDialog';
import { StoreProvider } from './store';

export default function App() {
  return (
    <StoreProvider>
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
      {/* 全局浮层 */}
      <UploadDialog />
      <AssetDrawer />
      <ProductionDrawer />
      <ThemeDialog />
    </StoreProvider>
  );
}
