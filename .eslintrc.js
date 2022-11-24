module.exports = {
  parserOptions: {
    project: './tsconfig.json',
  },
  extends: [
    '@pluralsh/eslint-config-typescript',
    'plugin:storybook/recommended',
  ],
  globals: {
    JSX: true,
  },
  rules: {
    '@typescript-eslint/consistent-type-exports': 'error',
  },
}
