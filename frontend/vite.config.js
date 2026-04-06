import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), eslint()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf')) {
              return 'vendor-jspdf';
            }
            if (id.includes('exceljs')) {
              return 'vendor-exceljs';
            }
            if (id.includes('react') || id.includes('bootstrap')) {
              return 'vendor-core';
            }
            return 'vendor-lib';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
