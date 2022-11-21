import type { StorybookConfig } from '@storybook/builder-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  core: {
    builder: '@storybook/builder-vite',
  },
  // docsPage: {
  //   docs: 'automatic',
  // },
  async viteFinal(config) {
    return {
      ...config,
      esbuild: {
        ...config.esbuild,
        jsxInject: `import React from 'react'`,
      },
      rollupOptions: {
        ...config,
        // Externalize deps that shouldn't be bundled
        external: ["react", "react-dom"],
        output: {
          // Global vars to use in UMD build for externalized deps
          globals: {
            react: "React",
            "react-dom": "ReactDOM",
          },
        },
      },
    };
  },
};

export default config;
