import { defineConfig } from 'vite';

export default defineConfig({
  // 项目根目录
  root: './',
  
  // 构建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 强制内联小资源
    assetsInlineLimit: 4096,
  },

  // 开发服务器配置
  server: {
    port: 3000,
    open: true,
  }
});
