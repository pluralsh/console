import config from '../eslint.config.mjs'
import storybook from 'eslint-plugin-storybook'

export default [
  ...config,
  { plugins: { storybook }, rules: { 'react/no-unescaped-entities': 'off' } },
]
