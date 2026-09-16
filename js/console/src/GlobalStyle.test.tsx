import { render } from '@testing-library/react'
import { StrictMode } from 'react'
import { ThemeProvider } from 'styled-components'
import { vi } from 'vitest'

import GlobalStyle from '../../design-system/src/GlobalStyle'
import {
  styledThemeDark,
  styledThemeLight,
} from '../../design-system/src/theme'
import DocSearchStyles from './components/help/DocSearchStyles'

// Match the browser's CSSOM injection mode.
vi.hoisted(() => vi.stubEnv('SC_DISABLE_SPEEDY', 'false'))

// Exercise client injection: the server entry does not run global style effects.
vi.mock('styled-components', () =>
  vi.importActual('styled-components/dist/styled-components.browser.esm.js')
)

function globalCss() {
  return Array.from(document.styleSheets)
    .flatMap((sheet) => Array.from(sheet.cssRules, (rule) => rule.cssText))
    .join('\n')
}

test('app globals survive DocSearch mounting, theme changes, and unmounting', () => {
  const app = (theme: typeof styledThemeDark, docSearch = true) => (
    <StrictMode>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        {docSearch && <DocSearchStyles />}
      </ThemeProvider>
    </StrictMode>
  )
  const view = render(app(styledThemeDark))

  try {
    expect(globalCss()).toContain('--color-text: #EEF0F1')
    expect(globalCss()).toContain('--docsearch-text-color: #EEF0F1')
    expect(window.getComputedStyle(document.body).color).toBe(
      'rgb(238, 240, 241)'
    )

    view.rerender(app(styledThemeLight))
    expect(globalCss()).toContain('--color-page-background: #F9FAFA')
    expect(window.getComputedStyle(document.body).backgroundColor).toBe(
      'rgb(249, 250, 250)'
    )

    view.rerender(app(styledThemeDark, false))
    expect(globalCss()).toContain('--color-text: #EEF0F1')
    expect(globalCss()).not.toContain('--docsearch-text-color:')
    expect(window.getComputedStyle(document.body).color).toBe(
      'rgb(238, 240, 241)'
    )
  } finally {
    view.unmount()
  }
})
