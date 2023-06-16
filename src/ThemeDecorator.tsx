import { Grommet } from 'grommet'
import { type ComponentType, useEffect } from 'react'
import {
  CssBaseline,
  Div,
  ThemeProvider as HonorableThemeProvider,
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

function ThemeDecorator(Story: ComponentType, context: any) {
  const colorMode = useThemeColorMode()

  useEffect(() => {
    setThemeColorMode(context.globals.theme)
  }, [context.globals.theme])

  const honorableTheme =
    colorMode === 'light' ? honorableThemeLight : honorableThemeDark
  const styledTheme = colorMode === 'light' ? styledThemeLight : styledThemeDark

  return (
    <Grommet plain>
      <HonorableThemeProvider theme={honorableTheme}>
        <StyledThemeProvider theme={styledTheme}>
          <CssBaseline />
          <StyledCss />
          <Div padding="xlarge">
            <Story />
          </Div>
        </StyledThemeProvider>
      </HonorableThemeProvider>
    </Grommet>
  )
}

export default ThemeDecorator
