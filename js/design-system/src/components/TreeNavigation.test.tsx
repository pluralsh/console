import { type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet, ThemeProvider } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import { styledThemeDark, styledThemeLight } from '../theme'
import { NavigationContextProvider } from './contexts/NavigationContext'
import { TreeNav, TreeNavEntry } from './TreeNavigation'

vi.mock('react-use-measure', () => ({
  default: () => [() => {}, { height: 0 }],
}))

function Link(props: ComponentProps<'a'>) {
  return <a {...props} />
}

describe.each([styledThemeDark, styledThemeLight])(
  'linked tree navigation in $mode mode',
  (theme) => {
    it.each([false, true])('preserves tab styling when active=%s', (active) => {
      const sheet = new ServerStyleSheet()
      try {
        const markup = renderToStaticMarkup(
          sheet.collectStyles(
            <ThemeProvider theme={theme}>
              <NavigationContextProvider
                value={{
                  Link,
                  usePathname: () => '/components',
                  useNavigate: () => () => {},
                }}
              >
                <TreeNav>
                  <TreeNavEntry
                    href="/components"
                    label="Components"
                    active={active}
                  />
                </TreeNav>
              </NavigationContextProvider>
            </ThemeProvider>
          )
        )
        const root = document.createElement('div')
        root.innerHTML = markup
        const link = root.querySelector('a')!
        const styles = sheet.getStyleTags()

        expect(link.getAttribute('href')).toBe('/components')
        expect(link.textContent).toBe('Components')
        // The link must retain Tab's inner container and selection indicator.
        expect(link.firstElementChild?.firstElementChild?.textContent).toBe(
          'Components'
        )
        expect(styles).toContain(
          `border-right:1px solid ${active ? theme.colors['border-primary'] : theme.colors.border}`
        )
        expect(styles).toContain(
          `color:${active ? theme.colors.text : theme.colors['text-xlight']}`
        )
        expect(styles).toContain(':hover{')
        expect(styles).toContain(
          `background-color:${theme.colors['fill-zero-hover']}`
        )
        expect(link.hasAttribute('borderRight')).toBe(false)
      } finally {
        sheet.seal()
      }
    })
  }
)
