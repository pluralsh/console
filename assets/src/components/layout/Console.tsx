import { Outlet } from 'react-router-dom'

import { Toast } from '@pluralsh/design-system'

import { A, Flex, Span } from 'honorable'
import { MarkdocContextProvider } from 'markdoc/MarkdocContext'

import ConsoleNavContextProvider from 'components/contexts/NavigationContext'

import { ReactNode } from 'react'

import BillingSubscriptionProvider from 'components/billing/BillingSubscriptionProvider'

import { EnsureLogin } from '../login/Login'
import { InstallationsProvider } from '../Installations'

import TerminalThemeProvider from '../terminal/TerminalThemeProvider'

import { CursorPositionProvider } from '../utils/CursorPosition'

import BreadcrumbProvider from './Breadcrumbs'

import Header from './Header'
import Subheader from './Subheader'

import Sidebar from './Sidebar'
import WithApplicationUpdate from './WithApplicationUpdate'
import { ContentOverlay } from './Overlay'

export const TOOLBAR_HEIGHT = '55px'
export const SIDEBAR_WIDTH = '200px'

function ContextProviders({ children }: { children: ReactNode }) {
  return (
    <CursorPositionProvider>
      <MarkdocContextProvider value={{ variant: 'console' }}>
        <ConsoleNavContextProvider>
          <EnsureLogin>
            <InstallationsProvider>
              <BillingSubscriptionProvider>
                <BreadcrumbProvider>
                  <TerminalThemeProvider>
                    {children}
                  </TerminalThemeProvider>
                </BreadcrumbProvider>
              </BillingSubscriptionProvider>
            </InstallationsProvider>
          </EnsureLogin>
        </ConsoleNavContextProvider>
      </MarkdocContextProvider>
    </CursorPositionProvider>
  )
}

export default function Console() {
  const isProduction = import.meta.env.MODE === 'production'

  return (
    <ContextProviders>
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
    </ContextProviders>
  )
}
