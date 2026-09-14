import { type ComponentType, useEffect } from 'react'
import { ThemeProvider as StyledThemeProvider } from 'styled-components'

import Flex from './components/Flex'

import {
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

  const styledTheme = colorMode === 'light' ? styledThemeLight : styledThemeDark

  return (
    <StyledThemeProvider theme={styledTheme}>
      <StyledCss />
      <Flex
        padding="xlarge"
        direction="column"
      >
        <Story />
      </Flex>
    </StyledThemeProvider>
  )
}

export default ThemeDecorator
