import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({
  root: path.resolve(process.cwd(), 'client'),
  envDir: process.cwd(),
  plugins: [react()],
  build: { outDir: path.resolve(process.cwd(), 'dist'), emptyOutDir: true },
  server: { port: 5173, proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } } },
});
