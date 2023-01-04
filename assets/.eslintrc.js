module.exports = {
  parserOptions: {
    project: './tsconfig.eslint.json',
  },
  extends: [
    '@pluralsh/eslint-config-typescript',
  ],
  globals: {
    JSX: true,
  },
  rules: {
    '@typescript-eslint/consistent-type-exports': 'error',
  },
}
