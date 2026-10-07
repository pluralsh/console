import { renderToString } from 'react-dom/server'
import { ServerStyleSheet, ThemeProvider } from 'styled-components'

import GlobalStyle from './GlobalStyle'
import { styledThemeDark, styledThemeLight } from './theme'

// Uses ServerStyleSheet on purpose: it exercises the global style object
// (theme tokens, css vars, stylis object serialization) the same way the
// client does, without depending on client-side style injection.
function renderGlobalCss(mode: 'dark' | 'light'): string {
  const sheet = new ServerStyleSheet()
  try {
    renderToString(
      sheet.collectStyles(
        <ThemeProvider
          theme={mode === 'dark' ? styledThemeDark : styledThemeLight}
        >
          <GlobalStyle />
        </ThemeProvider>
      )
    )

    return sheet.getStyleTags()
  } finally {
    sheet.seal()
  }
}

test('global style emits theme css vars', () => {
  const css = renderGlobalCss('dark')

  expect(css).toContain('--color-text:#EEF0F1')
  expect(css).toContain('--color-border:')
  expect(css).toContain('--color-page-background:#171a21')
})

test('global style sets body background and text color', () => {
  const css = renderGlobalCss('dark')

  expect(css).toMatch(/html,body\{[^}]*background-color:#171a21/)
  expect(css).toMatch(/html,body\{[^}]*color:#EEF0F1/)
})

test('global style follows light theme', () => {
  const css = renderGlobalCss('light')

  expect(css).toContain('--color-page-background:#F9FAFA')
  expect(css).toMatch(/html,body\{[^}]*background-color:#F9FAFA/)
})
