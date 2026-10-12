# eslint-config-pluralsh

> **Deprecated.** Console no longer uses this package: it lints with Biome plus a
> minimal ESLint config for the React Compiler rules (see `js/biome.json` and
> `js/eslint.config.mjs`). This package is no longer maintained.

Plural's shared ESLint flat config for type-checked TypeScript, React, React Hooks,
and imports. It contains the common configuration used by the Console and Plural
web applications. Formatting is left to a dedicated formatter (Console uses
Biome); conflicting stylistic rules are disabled via `eslint-config-prettier`.

## Installation

```sh
yarn add -D @pluralsh/eslint-config-pluralsh eslint typescript
```

ESLint 9.17 or newer and TypeScript 5.6 through 6.0 are supported.

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

## Development

This package lives in the Console JavaScript workspace. Install dependencies and
run its linter from the repository root:

```sh
corepack yarn --cwd js install
corepack yarn --cwd js workspace @pluralsh/eslint-config-pluralsh lint
```

Other packages in this repository should depend on it using `workspace:*`.

## License

MIT
