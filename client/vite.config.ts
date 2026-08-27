import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    strictPort: true, // 端口被占用时报错而非漂移
    // 开发环境代理：/api 与 /media 转发到后端
    proxy: {
      '/api': { target: 'http://127.0.0.1:4100', changeOrigin: true },
      '/media': { target: 'http://127.0.0.1:4100', changeOrigin: true },
    },
  },
  build: { outDir: 'dist' },
});
