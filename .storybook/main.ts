import { type StorybookConfig } from '@storybook/builder-vite'
import { mergeConfig } from 'vite'

import viteConfig from '../vite.config'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials', '@storybook/addon-interactions'],
  framework: {
    name: '@storybook/react-vite',
  },
  core: {
    builder: '@storybook/builder-vite',
  },
  viteFinal: async config => (mergeConfig(config, viteConfig)),
}

export default config
