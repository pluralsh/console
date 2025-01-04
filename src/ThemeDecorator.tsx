import { type ComponentType, type FC, useEffect } from 'react'
import {
  CssBaseline,
  Div,
  ThemeProvider as HonorableThemeProvider,
  type ThemeProviderProps,
} from 'honorable'
import { ThemeProvider as StyledThemeProvider } from 'styled-components'

import {
  honorableThemeDark,
  honorableThemeLight,
  setThemeColorMode,
  styledThemeDark,
  styledThemeLight,
  useThemeColorMode,
} from './theme'
import StyledCss from './GlobalStyle'

// workarounds for broken type from honorable
const TypedHonorableThemeProvider =
  HonorableThemeProvider as FC<ThemeProviderProps>
const TypedCssBaseline = CssBaseline as any

function ThemeDecorator(Story: ComponentType, context: any) {
  const colorMode = useThemeColorMode()

  useEffect(() => {
    setThemeColorMode(context.globals.theme)
  }, [context.globals.theme])

  const honorableTheme =
    colorMode === 'light' ? honorableThemeLight : honorableThemeDark
  const styledTheme = colorMode === 'light' ? styledThemeLight : styledThemeDark

  return (
    <TypedHonorableThemeProvider theme={honorableTheme}>
      <StyledThemeProvider theme={styledTheme}>
        <TypedCssBaseline />
        <StyledCss />
        <Div padding="xlarge">
          <Story />
        </Div>
      </StyledThemeProvider>
    </TypedHonorableThemeProvider>
  )
}

export default ThemeDecorator
