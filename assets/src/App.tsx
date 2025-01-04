import { ApolloProvider } from '@apollo/client'
import {
  GlobalStyle,
  honorableThemeDark,
  honorableThemeLight,
  styledThemeDark,
  styledThemeLight,
  useThemeColorMode,
} from '@pluralsh/design-system'
import { FC, ReactNode } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import {
  CssBaseline,
  ThemeProvider as HonorableThemeProvider,
  ThemeProviderProps,
} from 'honorable'
import {
  ThemeProvider as StyledThemeProvider,
  StyleSheetManager,
} from 'styled-components'

import DocSearchStyles from 'components/help/DocSearchStyles'
import { OverlayContextProvider } from 'components/layout/Overlay'

import { client } from './helpers/client'
import { rootRoutes } from './routes/rootRoutes'

import { shouldForwardProp } from 'utils/shouldForwardProp'
import { PluralErrorBoundary } from './components/cd/PluralErrorBoundary'

// workarounds for broken type from honorable
const TypedHonorableThemeProvider =
  HonorableThemeProvider as FC<ThemeProviderProps>
const TypedCssBaseline = CssBaseline as any

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

  return (
    <TypedHonorableThemeProvider theme={honorableTheme}>
      <StyleSheetManager shouldForwardProp={shouldForwardProp}>
        <StyledThemeProvider theme={styledTheme}>
          <OverlayContextProvider>
            <TypedCssBaseline />
            <GlobalStyle />
            <DocSearchStyles />
            <PluralErrorBoundary>{children}</PluralErrorBoundary>
          </OverlayContextProvider>
        </StyledThemeProvider>
      </StyleSheetManager>
    </TypedHonorableThemeProvider>
  )
}
