import plural from '@pluralsh/eslint-config-pluralsh'

export default plural({
  ignores: [
    'src/archive/*',
    'src/generated/**/*',
    '../design-system/**',
  ],
  tsconfigRootDir: import.meta.dirname,
})
