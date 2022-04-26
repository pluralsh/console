import { ComponentType, ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { CssBaseline, Div, ThemeProvider } from 'honorable'

import theme from './theme'

type ThemeDecoratorContext = {
  title?: string,
}

function ThemeDecorator(Story: ComponentType, { title }: ThemeDecoratorContext) {
  function wrapSidebar(node: ReactNode) {
    return (
      <BrowserRouter>
        <Div
          height="100vh"
          xflex="x1"
        >
          {node}
        </Div>
      </BrowserRouter>
    )
  }

  const story = <Story />

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {title === 'Sidebar' ? wrapSidebar(story) : <Div p={2}>{story}</Div>}
    </ThemeProvider>
  )
}

export default ThemeDecorator
