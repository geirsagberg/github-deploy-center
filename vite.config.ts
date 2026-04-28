import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), visualizer()],
  resolve: {
    alias: {
      'node-fetch': 'isomorphic-fetch',
    },
  },
  build: {
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('/node_modules/@octokit/')) {
            return 'octokit'
          }

          if (
            id.includes('/node_modules/@mui/material/') ||
            id.includes('/node_modules/@emotion/react/') ||
            id.includes('/node_modules/@emotion/styled/')
          ) {
            return 'mui'
          }
        },
      },
    },
  },
})
