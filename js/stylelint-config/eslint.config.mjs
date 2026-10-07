import plural from '@pluralsh/eslint-config-pluralsh'
import globals from 'globals'

export default [
  ...plural({
    files: ['*.js', '*.mjs'],
    tsconfigRootDir: import.meta.dirname,
  }),
  {
    files: ['*.js', '*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js', '*.mjs'],
        },
      },
    },
  },
]
