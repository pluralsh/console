import { ReactNode, useState } from 'react'
import {
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router-dom'
import { Grommet } from 'grommet'
import { IntercomProvider } from 'react-use-intercom'
import { ApolloProvider } from '@apollo/client'
import { mergeDeep } from '@apollo/client/utilities'
import { useMutationObserver } from '@react-hooks-library/core'

import {
  GlobalStyle,
  theme as honorableThemeDark,
  honorableThemeLight,
  styledThemeDark,
  styledThemeLight,
} from '@pluralsh/design-system'
import { ColorMode } from '@pluralsh/design-system/dist/theme'

import { CssBaseline, ThemeProvider } from 'honorable'
import { ThemeProvider as StyledThemeProvider } from 'styled-components'

import DocSearchStyles from 'components/help/DocSearchStyles'
import { OverlayContextProvider } from 'components/layout/Overlay'
import { CookieSettingsProvider } from 'components/tracking/CookieSettings'
import { updateIntercomUnread } from 'components/help/IntercomUpdateUnread'

import { DEFAULT_THEME } from './theme'
import 'react-toggle/style.css'
import 'react-pulse-dot/dist/index.css'
import { client } from './helpers/client'
import { rootRoutes } from './routes/rootRoutes'

import { PluralErrorBoundary } from './components/cd/PluralErrorBoundary'

const INTERCOM_APP_ID = 'p127zb9y'

const router = createBrowserRouter(createRoutesFromElements(rootRoutes))

export default function App() {
  return (
    <ApolloProvider client={client}>
      <IntercomProvider
        appId={INTERCOM_APP_ID}
        onUnreadCountChange={updateIntercomUnread}
      >
        <ThemeProviders>
          <RouterProvider router={router} />
        </ThemeProviders>
      </IntercomProvider>
    </ApolloProvider>
  )
}

const COLOR_THEME_KEY = 'theme-mode'

// function setThemeColorMode(
//   mode: ColorMode,
//   {
//     dataAttrName = COLOR_THEME_KEY,
//     element = document?.documentElement,
//   }: {
//     dataAttrName?: string
//     element?: HTMLElement
//   } = {}
// ) {
//   if (!element) {
//     return
//   }
//   localStorage.setItem(dataAttrName, mode)
//   element.setAttribute(`data-${dataAttrName}`, mode)
// }

export function useThemeColorMode({
  dataAttrName = COLOR_THEME_KEY,
  defaultMode = 'dark',
  element = document?.documentElement,
}: {
  dataAttrName?: string
  defaultMode?: ColorMode
  element?: HTMLElement
} = {}) {
  const attrName = `data-${dataAttrName}`
  const [thisTheme, setThisTheme] = useState(
    element?.getAttribute(attrName) || defaultMode
  )

  useMutationObserver(
    element,
    (mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation?.attributeName === attrName &&
          mutation.target instanceof HTMLElement
        ) {
          setThisTheme(mutation.target.getAttribute(attrName) || defaultMode)
        }
      })
    },
    { attributeFilter: [attrName] }
  )

  return thisTheme
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
          <CookieSettingsProvider>
            <CssBaseline />
            <GlobalStyle />
            <DocSearchStyles />
            <PluralErrorBoundary>
              <Grommet
                className="grommet-root"
                // @ts-ignore
                theme={mergedStyledTheme}
                themeMode="dark"
              >
                {children}
              </Grommet>
            </PluralErrorBoundary>
          </CookieSettingsProvider>
        </OverlayContextProvider>
      </StyledThemeProvider>
    </ThemeProvider>
  )
}
