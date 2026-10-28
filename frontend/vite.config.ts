import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Vite proxies API calls in development so the browser uses one origin.
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split heavy vendor groups so the application shell can be cached
        // independently from Ant Design, Markdown and Redux.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/antd/') || id.includes('/@ant-design/') || id.includes('/rc-')) {
            return 'antd-vendor';
          }
          if (
            id.includes('react-markdown') ||
            id.includes('/remark-') ||
            id.includes('/rehype-') ||
            id.includes('highlight.js') ||
            id.includes('/micromark') ||
            id.includes('/mdast-') ||
            id.includes('/hast-')
          ) {
            return 'markdown-vendor';
          }
          if (id.includes('@reduxjs') || id.includes('react-redux')) {
            return 'redux-vendor';
          }
          return 'vendor';
        },
      },
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/types/**', 'src/test/**'],
    },
  },
});
