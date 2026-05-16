import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type PluginOption } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const distDir = resolve(rootDir, 'dist');
const extensionIconFiles = [
  'icon-16x16.png',
  'icon-32x32.png',
  'icon-48x48.png',
  'icon-128x128.png',
];

function copyExtensionFiles(): PluginOption {
  return {
    name: 'copy-extension-files',
    closeBundle() {
      copyFileSync(resolve(rootDir, 'manifest.json'), resolve(distDir, 'manifest.json'));

      const distAssetsDir = resolve(distDir, 'assets');
      mkdirSync(distAssetsDir, { recursive: true });

      for (const iconFile of extensionIconFiles) {
        copyFileSync(resolve(rootDir, 'assets', iconFile), resolve(distAssetsDir, iconFile));
      }

      for (const unusedAsset of ['image.png', 'preview-dark.png', 'preview-readme.png', 'icons']) {
        rmSync(resolve(distAssetsDir, unusedAsset), { force: true, recursive: true });
      }
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
