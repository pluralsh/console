import { ApolloProvider } from '@apollo/client'
import {
  GlobalStyle,
  HonorableThemeProvider,
  styledThemeDark,
  styledThemeLight,
  useThemeColorMode,
} from '@pluralsh/design-system'
import { ReactNode } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import {
  ThemeProvider as StyledThemeProvider,
  StyleSheetManager,
} from 'styled-components'

import DocSearchStyles from 'components/help/DocSearchStyles'

import { client } from './helpers/client'
import { rootRoutes } from './routes/rootRoutes'

import { shouldForwardProp } from 'utils/shouldForwardProp'
import { PluralErrorBoundary } from './components/cd/PluralErrorBoundary'
import { loadErrorMessages, loadDevMessages } from '@apollo/client/dev'

// required by apollo so we can see errors in dev console
if (process.env.NODE_ENV === 'development') {
  loadDevMessages()
  loadErrorMessages()
}

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

  const styledTheme = colorMode === 'light' ? styledThemeLight : styledThemeDark

  return (
    <StyleSheetManager shouldForwardProp={shouldForwardProp}>
      <StyledThemeProvider theme={styledTheme}>
        <HonorableThemeProvider>
          <GlobalStyle />
          <DocSearchStyles />
          <PluralErrorBoundary>{children}</PluralErrorBoundary>
        </HonorableThemeProvider>
      </StyledThemeProvider>
    </StyleSheetManager>
  )
}
