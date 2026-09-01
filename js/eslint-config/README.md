# eslint-config-pluralsh

Plural's shared ESLint flat config for type-checked TypeScript, React, React Hooks,
imports, and Prettier. It contains the common configuration used by the Console
and Plural web applications.

## Installation

```sh
yarn add -D @pluralsh/eslint-config-pluralsh eslint prettier typescript
```

ESLint 9.17 or newer, Prettier 3, and TypeScript 5.6 through 6.0 are supported.

## Usage

Create `eslint.config.mjs` in the application directory:

```js
import plural from '@pluralsh/eslint-config-pluralsh'

export default plural({
  ignores: ['src/generated/**/*', 'build/**/*'],
  tsconfigRootDir: import.meta.dirname,
})
```

By default, application-specific rules target `src/**/*.{js,jsx,ts,tsx}`. Use the
`files` option to change that glob.

## License

MIT
