import { render, cleanup } from '@testing-library/react'
import { ThemeProvider, ServerStyleSheet } from 'styled-components'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, test, vi } from 'vitest'
import Input from './components/Input'
import Flex from './components/Flex'
import { styledThemeDark } from './theme'

afterEach(cleanup)

test('inspect native input accessible name', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  const { container } = render(<ThemeProvider theme={styledThemeDark}><Input aria-label="Model ID" /></ThemeProvider>)
  expect(container.querySelector('input')?.getAttribute('aria-label')).toBe('Model ID')
})

test('resolve migrated semantic spacing props', () => {
  const sheet = new ServerStyleSheet()
  renderToStaticMarkup(sheet.collectStyles(<ThemeProvider theme={styledThemeDark}><Flex paddingBottom="large" marginBottom="large">Title</Flex></ThemeProvider>))
  expect(sheet.getStyleTags()).toContain(`padding-bottom:${styledThemeDark.spacing.large}px`)
  sheet.seal()
})
