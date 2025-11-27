import { type Entries } from 'type-fest'

import { affixKeysToValues } from '../utils/ts-utils'

import { semanticColorsDark } from './colors-semantic-dark'

export const semanticColorKeys = (
  Object.entries(semanticColorsDark) as Entries<typeof semanticColorsDark>
).map(([key]) => key)

export type SemanticColorKey = keyof typeof semanticColorsDark

const cssVarPrefix = '--color-'

export function colorKeyToCssVar<T extends string>(key: T): string {
  return `${cssVarPrefix}${key}` as `${typeof cssVarPrefix}${T}`
}

export const semanticColorCssVars = affixKeysToValues(semanticColorsDark, {
  prefix: `var(${cssVarPrefix}`,
  suffix: `)`,
})

export type SemanticColorCssVar =
  (typeof semanticColorCssVars)[keyof typeof semanticColorCssVars]
