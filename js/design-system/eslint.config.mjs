import plural from '@pluralsh/eslint-config-pluralsh'
import storybook from 'eslint-plugin-storybook'

export default [
  ...plural({
    ignores: ['src/**/*.stories.ts', 'src/**/*.stories.tsx'],
    tsconfigRootDir: import.meta.dirname,
  }),
  { plugins: { storybook } },
]
