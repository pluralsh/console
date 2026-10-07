import { renderToString } from 'react-dom/server'
import { ThemeProvider, ServerStyleSheet } from 'styled-components'
import { describe, expect, test } from 'vitest'

import Flex from './Flex'
import Input from './Input'
import { styledThemeDark } from '../theme'

describe('migrated form primitives', () => {
  test('forwards accessibility attributes to the native input', () => {
    const markup = renderToString(
      <ThemeProvider theme={styledThemeDark}>
        <Input aria-label="Model ID" />
      </ThemeProvider>
    )

    expect(markup).toContain('aria-label="Model ID"')
  })

  test('resolves semantic spacing props', () => {
    const sheet = new ServerStyleSheet()

    try {
      renderToString(
        sheet.collectStyles(
          <ThemeProvider theme={styledThemeDark}>
            <Flex
              paddingBottom="large"
              marginBottom="medium"
              width="100%"
            />
          </ThemeProvider>
        )
      )

      const styles = sheet.getStyleTags()
      expect(styles).toContain('padding-bottom:24px')
      expect(styles).toContain('margin-bottom:16px')
      expect(styles).toContain('width:100%')
    } finally {
      sheet.seal()
    }
  })
})
