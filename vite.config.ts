import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const { visualizer } = await import('rollup-plugin-visualizer')

  return {
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
  }
})
