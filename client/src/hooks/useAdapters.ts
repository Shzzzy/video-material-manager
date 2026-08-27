/** 适配器状态加载 hook */
import { useEffect } from 'react';
import { useStore } from '../store';

export function useAdapters(): void {
  const { reloadAdapters } = useStore();
  useEffect(() => {
    void reloadAdapters();
  }, [reloadAdapters]);
}
