import { ComponentType, ReactNode } from 'react'
import { Box, Grommet } from 'grommet'
import { BrowserRouter } from 'react-router-dom'
import { CssBaseline, Div, ThemeProvider } from 'honorable'

import grommetTheme from './theme-grommet'
import theme from './theme'

type ThemeDecoratorContext = {
  title?: string,
}

function ThemeDecorator(Story: ComponentType, { title }: ThemeDecoratorContext) {
  function wrapTheme(node: ReactNode) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Grommet
          full
          theme={grommetTheme}
        >
          {node}
        </Grommet>
      </ThemeProvider>
    )
  }
  function wrapSidebar(node: ReactNode) {
    return (
      <BrowserRouter>
        <Box
          style={{ height: '100vh' }}
          direction="row"
        >
          {node}
        </Box>
      </BrowserRouter>
    )
  }

  const story = <Story />

  return wrapTheme(title === 'Sidebar' ? wrapSidebar(story) : <Div p={2}>{story}</Div>)
}

export default ThemeDecorator
