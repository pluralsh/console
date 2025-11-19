import { type ComponentType, useEffect } from 'react'
import { Div } from 'honorable'
import { ThemeProvider as StyledThemeProvider } from 'styled-components'

import {
  setThemeColorMode,
  styledThemeDark,
  styledThemeLight,
  useThemeColorMode,
} from './theme'
import StyledCss from './GlobalStyle'
import { HonorableThemeProvider } from '.'

function ThemeDecorator(Story: ComponentType, context: any) {
  const colorMode = useThemeColorMode()

  useEffect(() => {
    setThemeColorMode(context.globals.theme)
  }, [context.globals.theme])

  const styledTheme = colorMode === 'light' ? styledThemeLight : styledThemeDark

  return (
    <StyledThemeProvider theme={styledTheme}>
      <HonorableThemeProvider>
        <StyledCss />
        <Div padding="xlarge">
          <Story />
        </Div>
      </HonorableThemeProvider>
    </StyledThemeProvider>
  )
}

export default ThemeDecorator
