import { type StorybookConfig } from '@storybook/react-vite'

export default {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],

  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],

  core: {
    builder: '@storybook/builder-vite',
  },

  framework: '@storybook/react-vite',

  // TODO: Enable if we need autodocs. Causes a CJS warning in vite
  // typescript: {
  //   reactDocgen: 'react-docgen-typescript',
  // },
} as StorybookConfig
