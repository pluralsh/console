import { RouterProvider, createBrowserRouter, createRoutesFromElements } from 'react-router-dom'
import { Grommet } from 'grommet'
import { useEffect } from 'react'

import { IntercomProvider } from 'react-use-intercom'

import { ApolloProvider } from '@apollo/client'

import { mergeDeep } from '@apollo/client/utilities'

import { GlobalStyle, styledTheme, theme } from '@pluralsh/design-system'
import { CssBaseline, ThemeProvider } from 'honorable'
import { ThemeProvider as StyledThemeProvider } from 'styled-components'
import posthog from 'posthog-js'

import { OverlayContextProvider } from 'components/layout/Overlay'
import { CookieSettingsProvider } from 'components/tracking/CookieSettings'

import { addPrefChangeListener, getPrefs, removePrefChangeListener } from './utils/cookiePrefs'

import { DEFAULT_THEME } from './theme'
import 'react-toggle/style.css'
import 'react-pulse-dot/dist/index.css'
import { client } from './helpers/client'
import { rootRoutes } from './routes/rootRoutes'

const INTERCOM_APP_ID = 'p127zb9y'

const router = createBrowserRouter(createRoutesFromElements(rootRoutes))

export function PosthogOptInOut() {
  // Detect cookie preference change
  useEffect(() => {
    if (getPrefs().statistics) {
      console.log('posthog opt in')
      posthog.opt_in_capturing()
    }
    const onPrefChange = () => {
      if (getPrefs().statistics) {
        console.log('posthog opt in')
        posthog.opt_in_capturing()
      }
      else {
        console.log('posthog opt out')
        posthog.opt_out_capturing()
      }
    }

    addPrefChangeListener(onPrefChange)

    return () => {
      removePrefChangeListener(onPrefChange)
    }
  }, [])

  return null
}

export default function App() {
  const mergedStyledTheme = mergeDeep(DEFAULT_THEME, styledTheme)

  return (
    <ApolloProvider client={client}>
      <PosthogOptInOut />
      <IntercomProvider appId={INTERCOM_APP_ID}>
        <ThemeProvider theme={theme}>
          <StyledThemeProvider theme={mergedStyledTheme}>
            <OverlayContextProvider>
              <CookieSettingsProvider>
                <CssBaseline />
                <GlobalStyle />
                <Grommet
                  full
                  theme={mergedStyledTheme}
                  themeMode="dark"
                >
                  <RouterProvider router={router} />
                </Grommet>
              </CookieSettingsProvider>
            </OverlayContextProvider>
          </StyledThemeProvider>
        </ThemeProvider>
      </IntercomProvider>
    </ApolloProvider>
  )
}
