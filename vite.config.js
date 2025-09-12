import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'uff.js'),
        'modules/metaLinks': resolve(__dirname, 'modules/metaLinks.js'),
        'modules/anchors': resolve(__dirname, 'modules/anchors.js'),
        'modules/blindsearch': resolve(__dirname, 'modules/blindsearch.js'),
        'modules/deepSearch': resolve(__dirname, 'modules/deepSearch.js'),
        'modules/eventEmitter': resolve(__dirname, 'modules/eventEmitter.js'),
        'modules/fetchWithTimeout': resolve(__dirname, 'modules/fetchWithTimeout.js')
      },
      name: 'UltimateFeedFinder',
      fileName: (format, entryName) => {
        if (entryName === 'index') {
          return `uff.${format === 'es' ? 'js' : 'cjs'}`;
        }
        return `${entryName}.${format === 'es' ? 'js' : 'cjs'}`;
      },
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: [
        'linkedom',
        'async',
        'chalk',
        'isurl-module',
        'normalize-url',
        'parse5',
        'tldts',
        'truncate-url'
      ],
      output: {
        globals: {
          linkedom: 'linkedom',
          async: 'async',
          chalk: 'chalk',
          'isurl-module': 'isurlModule',
          'normalize-url': 'normalizeUrl',
          parse5: 'parse5',
          tldts: 'tldts',
          'truncate-url': 'truncateUrl'
        }
      }
    }
  }
});