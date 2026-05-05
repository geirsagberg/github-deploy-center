import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'

const reactCompiler = reactCompilerPreset()
reactCompiler.rolldown.filter.id = { exclude: ['src/generated/**'] }

const matchesPackage = (id: string, packageName: string) =>
  id.includes(`/node_modules/${packageName}/`)

const matchesAnyPackage = (id: string, packageNames: string[]) =>
  packageNames.some((packageName) => matchesPackage(id, packageName))

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
          if (matchesPackage(id, '@octokit')) {
            return 'octokit'
          }

          if (
            matchesPackage(id, '@mui') ||
            matchesPackage(id, '@emotion') ||
            matchesPackage(id, '@pigment-css')
          ) {
            return 'mui'
          }

          if (matchesAnyPackage(id, ['react', 'react-dom', 'scheduler'])) {
            return 'react'
          }

          if (
            matchesAnyPackage(id, [
              '@tanstack/query-core',
              '@tanstack/react-query',
              '@tanstack/react-query-devtools',
            ])
          ) {
            return 'query'
          }

          if (
            matchesAnyPackage(id, [
              'zod',
              'yaml',
              'graphql',
              'graphql-tag',
              'graphql-request',
              'lodash-es',
              'dayjs',
              'valtio',
              'proxy-compare',
              'react-modal-promise',
              'uuid',
              'tslib',
            ])
          ) {
            return 'data'
          }
        },
      },
    },
  },
})
