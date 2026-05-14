import { copyFileSync, cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type PluginOption } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const distDir = resolve(rootDir, 'dist');

function copyExtensionStaticFiles(): PluginOption {
  return {
    name: 'copy-extension-static-files',
    closeBundle() {
      mkdirSync(resolve(distDir, 'src/content'), { recursive: true });
      copyFileSync(resolve(rootDir, 'manifest.json'), resolve(distDir, 'manifest.json'));
      copyFileSync(
        resolve(rootDir, 'src/content/content.css'),
        resolve(distDir, 'src/content/content.css'),
      );
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
    emptyOutDir: true,
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: resolve(rootDir, 'src/background/background.ts'),
        content: resolve(rootDir, 'src/content/content.ts'),
        popup: resolve(rootDir, 'src/popup/popup.html'),
      },
      output: {
        entryFileNames(chunkInfo) {
          if (chunkInfo.name === 'background') {
            return 'src/background/background.js';
          }

          if (chunkInfo.name === 'content') {
            return 'src/content/content.js';
          }

          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  plugins: [copyExtensionStaticFiles()],
});
