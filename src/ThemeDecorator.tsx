import { ComponentType } from 'react'
import { CssBaseline, Div, ThemeProvider } from 'honorable'

import theme from './theme'

function ThemeDecorator(Story: ComponentType) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Div p={2}>
        <Story />
      </Div>
    </ThemeProvider>
  )
}

export default ThemeDecorator
