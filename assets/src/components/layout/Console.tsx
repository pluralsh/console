import { Toast } from '@pluralsh/design-system'
import { MarkdocContextProvider } from '@pluralsh/design-system/dist/markdoc/MarkdocContext'
import BillingSubscriptionProvider from 'components/billing/BillingSubscriptionProvider'
import BreadcrumbsProvider from 'components/contexts/BreadcrumbsProvider'
import ConsoleNavContextProvider from 'components/contexts/NavigationContext'
import usePosthogIdentify from 'components/utils/Posthog'
import { A, Flex, Span } from 'honorable'
import { Outlet } from 'react-router-dom'

import { PluralProvider } from '../contexts/PluralContext'
import { InstallationsProvider } from '../Installations'
import { EnsureLogin } from '../login/Login'
import TerminalThemeProvider from '../terminal/TerminalThemeProvider'
import { CursorPositionProvider } from '../utils/CursorPosition'

import Header from './Header'
import { ContentOverlay } from './Overlay'
import Sidebar from './Sidebar'
import Subheader from './Subheader'
import WithApplicationUpdate from './WithApplicationUpdate'

export const TOOLBAR_HEIGHT = '55px'
export const SIDEBAR_WIDTH = '200px'

export default function Console() {
  return (
    <CursorPositionProvider>
      <MarkdocContextProvider value={{ variant: 'console' }}>
        <ConsoleNavContextProvider>
          <EnsureLogin>
            <InstallationsProvider>
              <PluralProvider>
                <BillingSubscriptionProvider>
                  <BreadcrumbsProvider>
                    <TerminalThemeProvider>
                      <ConsoleContent />
                    </TerminalThemeProvider>
                  </BreadcrumbsProvider>
                </BillingSubscriptionProvider>
              </PluralProvider>
            </InstallationsProvider>
          </EnsureLogin>
        </ConsoleNavContextProvider>
      </MarkdocContextProvider>
    </CursorPositionProvider>
  )
}

function ConsoleContent() {
  const isProduction = import.meta.env.MODE === 'production'

  usePosthogIdentify()

  return (
    <Flex
      position="relative"
      width="100vw"
      maxWidth="100vw"
      height="100vh"
      minWidth="0"
      minHeight="0"
      maxHeight="100vh"
      overflow="hidden"
      flexDirection="column"
    >
      {isProduction && (
        <WithApplicationUpdate>
          {({ reloadApplication }) => (
            <Toast
              severity="info"
              marginBottom="medium"
              marginRight="xxxxlarge"
            >
              <Span marginRight="small">Time for a new update!</Span>
              <A
                onClick={() => reloadApplication()}
                style={{ textDecoration: 'none' }}
                color="action-link-inline"
              >
                Update now
              </A>
            </Toast>
          )}
        </WithApplicationUpdate>
      )}
      <Header />
      <Flex
        width="100%"
        minWidth={0}
        minHeight={0}
        flexGrow={1}
      >
        <Sidebar />
        <Flex
          direction="column"
          flexGrow={1}
          overflowX="hidden"
          position="relative"
        >
          <ContentOverlay />
          <Subheader />
          <Outlet />
        </Flex>
      </Flex>
    </Flex>
  )
}
