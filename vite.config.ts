import path from 'path'

import { defineConfig } from 'vite'
import react from 'vite-preset-react'
// import basicSsl from '@vitejs/plugin-basic-ssl'
// import GlobalPolyFill from '@esbuild-plugins/node-globals-polyfill'
// import { VitePWA } from 'vite-plugin-pwa'

const isExternal = (id: string) => !id.startsWith('.') && !path.isAbsolute(id)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // basicSsl(),
    react(),
    // VitePWA({
    //   injectRegister: null,
    //   filename: 'service-worker.ts',
    //   srcDir: 'src',
    //   strategies: 'injectManifest',
    // }),
  ],
  esbuild: {
    jsxInject: "import React from 'react'",
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
    },
    rollupOptions: {
      external: isExternal,
    },
  },
  // server: {
  //   port: 6006,
  //   https: false,
  // },
  // define: {
  //   'process.env': {}, // Needed otherwise production build will fail with Uncaught ReferenceError: process is not defined. See https://github.com/vitejs/vite/issues/1973
  // },
  // build: {
  //   outDir: 'dist',
  //   sourcemap: process.env.NODE_ENV !== 'production', // Seems to cause JavaScript heap out of memory errors on build
  // },
  // optimizeDeps: {
  //   esbuildOptions: {
  //     define: {
  //       global: 'globalThis',
  //     },
  //     plugins: [
  //       // @ts-expect-error
  //       GlobalPolyFill.default({
  //         process: true,
  //         buffer: true,
  //       }),
  //     ],
  //   },
  // },
  // resolve: {
  //   alias: {
  //     process: 'process/browser',
  //     stream: 'stream-browserify',
  //     zlib: 'browserify-zlib',
  //     util: 'util',
  //   },
  // },
})
