import { copyFileSync, cpSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type PluginOption } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const distDir = resolve(rootDir, 'dist');

function copyExtensionFiles(): PluginOption {
  return {
    name: 'copy-extension-files',
    closeBundle() {
      copyFileSync(resolve(rootDir, 'manifest.json'), resolve(distDir, 'manifest.json'));
      cpSync(resolve(rootDir, 'assets'), resolve(distDir, 'assets'), {
        recursive: true,
        filter: (source) => !source.endsWith('.DS_Store'),
      });
    },
  };
}

export default defineConfig({
  base: './',
  build: {
    emptyOutDir: false,
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(rootDir, 'src/popup/popup.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  plugins: [copyExtensionFiles()],
});
