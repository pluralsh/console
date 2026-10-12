// Biome (biome.json) handles formatting and most lint rules. ESLint only runs
// the React hooks / React Compiler rules, which Biome has no equivalent for.
import tsParser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  {
    ignores: [
      '**/src/generated/**',
      'design-system/src/**/*.stories.{ts,tsx}',
      'documentation/src/routing/navigation.ts',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: { parser: tsParser },
  },
  reactHooks.configs.flat['recommended-latest'],
  {
    rules: {
      // React Compiler rules are warnings until both applications are compliant.
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
]
