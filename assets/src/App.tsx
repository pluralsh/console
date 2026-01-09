import { ApolloProvider } from '@apollo/client'

import { loadDevMessages, loadErrorMessages } from '@apollo/client/dev'
import {
  GlobalStyle,
  HonorableThemeProvider,
  styledThemeDark,
  styledThemeLight,
  useThemeColorMode,
} from '@pluralsh/design-system'
import * as Sentry from '@sentry/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import DocSearchStyles from 'components/help/DocSearchStyles'
import { ReactNode } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import {
  StyleSheetManager,
  ThemeProvider as StyledThemeProvider,
} from 'styled-components'
import { shouldForwardProp } from 'utils/shouldForwardProp'
import { PluralErrorBoundary } from './components/cd/PluralErrorBoundary'

import { client } from './helpers/client'
import { rootRoutes } from './routes/rootRoutes'

// required by apollo so we can see errors in dev console
if (process.env.NODE_ENV === 'development') {
  loadDevMessages()
  loadErrorMessages()
}

// setAxiosFactory(getAxiosInstance)

const sentryCreateBrowserRouter =
  Sentry.wrapCreateBrowserRouterV6(createBrowserRouter)

const router = sentryCreateBrowserRouter(rootRoutes)
const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ApolloProvider client={client}>
        <ThemeProviders>
          <RouterProvider router={router} />
        </ThemeProviders>
      </ApolloProvider>
    </QueryClientProvider>
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
