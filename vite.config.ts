import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'

const reactCompiler = reactCompilerPreset()
reactCompiler.rolldown.filter.id = { exclude: ['src/generated/**'] }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompiler] }), visualizer()],
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
