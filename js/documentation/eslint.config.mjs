import plural from '@pluralsh/eslint-config-pluralsh'
import jsxA11y from 'eslint-plugin-jsx-a11y'

const files = ['{src,pages}/**/*.{js,jsx,ts,tsx}']

export default [
  ...plural({
    files,
    ignores: [
      'src/generated/**/*',
      'src/routing/registry.ts',
      'src/routing/navigation.ts',
    ],
    tsconfigRootDir: import.meta.dirname,
  }),
  {
    ...jsxA11y.flatConfigs.recommended,
    files,
  },
  {
    files,
    settings: {
      'import/resolver': {
        typescript: {},
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports' },
      ],
      'import/no-duplicates': ['error', { 'prefer-inline': true }],
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          pathGroups: [
            {
              pattern: 'react',
              group: 'builtin',
              position: 'after',
            },
            {
              pattern: '{next,next/*,@pluralsh/design-system}',
              group: 'external',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: [
            'react',
            '{next/*,next,@pluralsh/design-system}',
          ],
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'unknown',
            'type',
          ],
        },
      ],
      'jsx-a11y/label-has-associated-control': [
        'error',
        {
          labelComponents: ['Label'],
          controlComponents: ['Input'],
          assert: 'either',
          depth: 3,
        },
      ],
    },
  },
]
