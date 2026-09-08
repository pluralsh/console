import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config'

// https://vitest.dev/config/
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
    },
  })
)
