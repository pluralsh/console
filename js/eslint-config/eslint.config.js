import plural from './index.js'

const config = plural({
  files: ['*.js'],
  ignores: ['.yarn/**'],
  tsconfigRootDir: import.meta.dirname,
})

export default [
  ...config,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js'],
        },
      },
    },
  },
]
