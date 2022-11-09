import { BrowserRouter, Route, Switch } from 'react-router-dom'
import { Grommet } from 'grommet'

import { IntercomProvider } from 'react-use-intercom'

import { ApolloProvider } from 'react-apollo'

import { mergeDeep } from '@apollo/client/utilities'

import { GlobalStyle, styledTheme, theme } from 'pluralsh-design-system'
import { CssBaseline, ThemeProvider } from 'honorable'
import { ThemeProvider as StyledThemeProvider } from 'styled-components'

import { DEFAULT_THEME } from './theme'
import Console from './components/Console'
import Login, { GrantAccess } from './components/Login'
import Invite from './components/Invite'
import { OAuthCallback } from './components/OauthCallback'
import 'react-toggle/style.css'
import 'react-pulse-dot/dist/index.css'
import { client } from './helpers/client'

const INTERCOM_APP_ID = 'p127zb9y'

export default function App() {
  const mergedStyledTheme = mergeDeep(DEFAULT_THEME, styledTheme)

  return (
    <ApolloProvider client={client}>
      <IntercomProvider appId={INTERCOM_APP_ID}>
        <ThemeProvider theme={theme}>
          <StyledThemeProvider theme={mergedStyledTheme}>
            <CssBaseline />
            <GlobalStyle />
            <Grommet
              full
              theme={mergedStyledTheme}
              themeMode="dark"
            >
              <BrowserRouter>
                <Switch>
                  <Route
                    path="/login"
                    component={Login}
                  />
                  <Route
                    path="/access"
                    component={GrantAccess}
                  />
                  <Route
                    path="/oauth/callback"
                    component={OAuthCallback}
                  />
                  <Route
                    path="/invite/:inviteId"
                    component={Invite}
                  />
                  <Route
                    path="/"
                    component={Console}
                  />
                </Switch>
              </BrowserRouter>
            </Grommet>
          </StyledThemeProvider>
        </ThemeProvider>
      </IntercomProvider>
    </ApolloProvider>
  )
}
