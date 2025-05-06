import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron({
      entry: [
        'electron/main.ts',
        'electron/preload.ts'
      ],
      vite: {
        build: {
          sourcemap: true,
          minify: false,
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron', 'electron-store']
    }
  },
  server: {
    watch: {
      usePolling: true,
    },
  },
}); 