import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'
import rollupNodePolyFill from 'rollup-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // --- THIS IS THE FIX ---
  // Add the server block to expose the dev server to your network
  server: {
    host: true, // This is the crucial line for network access
    port: 5173,
  },
  resolve: {
    alias: {
      'buffer': 'rollup-plugin-node-polyfills/polyfills/buffer-es6',
      'process': 'rollup-plugin-node-polyfills/polyfills/process-es6'
    }
  },
  define: {
    'global': 'window',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true,
        }),
        NodeModulesPolyfillPlugin()
      ]
    }
  },
  build: {
    rollupOptions: {
      plugins: [
        rollupNodePolyFill()
      ]
    }
  }
})