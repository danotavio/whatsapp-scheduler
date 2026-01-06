import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '.',
    emptyOutDir: false,
    rollupOptions: {
      input: './src/popup.jsx',
      output: {
        entryFileNames: 'popup.js',
        format: 'iife',
        name: 'WhatsAppScheduler',
      },
    },
  },
});

