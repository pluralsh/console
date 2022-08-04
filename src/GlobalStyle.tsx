import { createGlobalStyle } from 'styled-components'

import {
  borderRadiuses,
  borderStyles,
  borderWidths,
  borders,
  boxShadows,
  fontFamilies,
  spacing,
} from './theme'

const colorsToCSSVars: (colors: unknown) => any = colors => {
  function inner(colors: unknown, prefix = '') {
    Object.entries(colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        cssVars[`--color-${prefix}${key}`] = value
      }
      else if (typeof value === 'object') {
        inner(value, `${prefix}${key}-`)
      }
    })
  }

  const cssVars = {}

  inner(colors)

  return cssVars
}

const fontsToCSSVars = Object.fromEntries(Object.entries(fontFamilies).map(([name, value]) => [`--font-${name}`, value]))
const shadowsToCSSVars = Object.fromEntries(Object.entries(boxShadows).map(([name, value]) => [
  `--box-shadow-${name}`,
  value,
]))
const spacingToCSSVars = Object.fromEntries(Object.entries(spacing).map(([name, value]) => [
  `--space-${name}`,
  `${value}px`,
]))
const radiiToCSSVars = Object.fromEntries(Object.entries(borderRadiuses).map(([name, value]) => [
  `--radius-${name}`,
  `${value}px`,
]))
const borderStylesCSSVars = Object.fromEntries(Object.entries(borderStyles).map(([name, value]) => [
  `--border-style-${name}`,
  value,
]))
const borderWidthsToToCSSVars = Object.fromEntries(Object.entries(borderWidths).map(([name, value]) => [
  `--border-width-${name}`,
  `${value}px`,
]))
const bordersToCSSVars = Object.fromEntries(Object.entries(borders).map(([name, value]) => [`--border-${name}`, value]))

const GlobalStyle = createGlobalStyle(({ theme }) => {
  console.log('theme.colors', theme.colors)

  return {
    ':root': {
      ...(theme.colors ? colorsToCSSVars(theme.colors) : {}),
      ...fontsToCSSVars,
      ...shadowsToCSSVars,
      ...spacingToCSSVars,
      ...radiiToCSSVars,
      ...borderStylesCSSVars,
      ...borderWidthsToToCSSVars,
      ...bordersToCSSVars,
    },
    '*': theme.partials.scrollBar(),
  }
})

export default GlobalStyle
