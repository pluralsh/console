import { ReactNode } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import { mergeDeep } from '@apollo/client/utilities'
import {
  GlobalStyle,
  honorableThemeDark,
  honorableThemeLight,
  styledThemeDark,
  styledThemeLight,
  useThemeColorMode,
} from '@pluralsh/design-system'

import { CssBaseline, ThemeProvider } from 'honorable'
import { ThemeProvider as StyledThemeProvider } from 'styled-components'

import DocSearchStyles from 'components/help/DocSearchStyles'
import { OverlayContextProvider } from 'components/layout/Overlay'

import { DEFAULT_THEME } from './theme'
import 'react-toggle/style.css'
import 'react-pulse-dot/dist/index.css'
import { client } from './helpers/client'
import { rootRoutes } from './routes/rootRoutes'

import { PluralErrorBoundary } from './components/cd/PluralErrorBoundary'

const router = createBrowserRouter(rootRoutes)

export default function App() {
  return (
    <ApolloProvider client={client}>
      <ThemeProviders>
        <RouterProvider router={router} />
      </ThemeProviders>
    </ApolloProvider>
  )
}

function ThemeProviders({ children }: { children: ReactNode }) {
  const colorMode = useThemeColorMode()

  const honorableTheme =
    colorMode === 'light' ? honorableThemeLight : honorableThemeDark
  const styledTheme = colorMode === 'light' ? styledThemeLight : styledThemeDark
  const mergedStyledTheme = mergeDeep(DEFAULT_THEME, styledTheme)

  return (
    <ThemeProvider theme={honorableTheme}>
      <StyledThemeProvider theme={mergedStyledTheme}>
        <OverlayContextProvider>
          <CssBaseline />
          <GlobalStyle />
          <DocSearchStyles />
          <PluralErrorBoundary>{children}</PluralErrorBoundary>
        </OverlayContextProvider>
      </StyledThemeProvider>
    </ThemeProvider>
  )
}
