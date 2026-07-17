import plural from '@pluralsh/eslint-config-pluralsh'
import storybook from 'eslint-plugin-storybook'

export default [
  ...plural({
    tsconfigRootDir: import.meta.dirname,
  }),
  { plugins: { storybook } },
]
