import { fixupPluginRules } from '@eslint/compat'
import importPlugin from 'eslint-plugin-import'
import prettier from 'eslint-plugin-prettier/recommended'
import react from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import reactCompiler from 'eslint-plugin-react-compiler'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  { ignores: ['src/archive/*', 'src/generated/**/*'] },
  ...tseslint.configs.recommendedTypeChecked,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  importPlugin.flatConfigs.recommended,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },

      globals: {
        ...globals.browser,
      },
    },

    plugins: {
      react,
      'react-hooks': fixupPluginRules(reactHooksPlugin),
      'react-compiler': reactCompiler,
    },

    settings: { react: { version: 'detect' } },

    rules: {
      ...reactHooksPlugin.configs.recommended.rules,

      // Typescript
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // React
      // Allow css prop for styled-components
      'react/no-unknown-property': ['error', { ignore: ['css'] }],
      'react/require-default-props': 'off',
      'react/destructuring-assignment': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'react/jsx-key': 'off',
      // React Compiler
      'react-compiler/react-compiler': 'warn',

      // Prettier
      'prettier/prettier': 'error',

      // Other
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
      'import/no-extraneous-dependencies': 'off',
      'import/no-named-as-default': 'off',
      'import/named': 'off',

      'no-unused-vars': 'off',
    },
  },
]
