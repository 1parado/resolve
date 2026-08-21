import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Resolve 控制台（Vue 3 + TS），入口为 app.html。
// 仓库根目录的营销落地页为独立静态页，不参与构建。
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    open: '/app.html',
    watch: {
      // Windows 上文件编辑器使用临时文件替换，原生 watcher 会 EBUSY 崩溃，改用轮询
      usePolling: true,
      interval: 200,
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL('./app.html', import.meta.url)),
      },
    },
  },
})