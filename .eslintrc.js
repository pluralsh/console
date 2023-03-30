module.exports = {
  parserOptions: {
    project: './tsconfig.eslint.json',
  },
  extends: [
    '@pluralsh/eslint-config-typescript',
    'plugin:storybook/recommended',
    'prettier',
  ],
  globals: {
    JSX: true,
  },
  rules: {
    '@typescript-eslint/consistent-type-exports': 'error',
    'import-newlines/enforce': 'off',
  },
}
