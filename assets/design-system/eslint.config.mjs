import config from '../eslint.config.mjs'
import storybook from 'eslint-plugin-storybook'

export default [...config, { plugins: { ...config.plugins, storybook } }]
