import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' — чтобы собранный index.html корректно открывался через loadFile() в Electron
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173, strictPort: true },
  build: { outDir: 'dist' },
});
