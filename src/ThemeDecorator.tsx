import { ComponentType } from 'react'
import { CssBaseline, Div, ThemeProvider as HonorableThemeProvider } from 'honorable'
import { ThemeProvider as StyledThemeProvider } from 'styled-components'

import theme, { styledTheme } from './theme'
import StyledCss from './GlobalStyle'

function ThemeDecorator(Story: ComponentType) {
  return (
    <HonorableThemeProvider theme={theme}>
      <StyledThemeProvider theme={styledTheme}>
        <CssBaseline />
        <StyledCss />
        <Div padding="xlarge">
          <Story />
        </Div>
      </StyledThemeProvider>
    </HonorableThemeProvider>
  )
}

export default ThemeDecorator
