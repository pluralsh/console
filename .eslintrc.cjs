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
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { fixStyle: 'inline-type-imports' },
    ],
    'import-newlines/enforce': 'off',
  },
}
