import { Flex, MarkdocContextProvider, Toast } from '@pluralsh/design-system'
import { Suspense } from 'react'

import BillingSubscriptionProvider from 'components/billing/BillingSubscriptionProvider'
import BreadcrumbsProvider from 'components/contexts/BreadcrumbsProvider'
import ConsoleNavContextProvider from 'components/contexts/NavigationContext'
import { Outlet } from 'react-router-dom'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { DeploymentSettingsProvider } from 'components/contexts/DeploymentSettingsContext'

import { useCloudSetupUnfinished } from 'components/contexts'

import { EnsureLogin } from '../login/Login'
import TerminalThemeProvider from '../terminal/TerminalThemeProvider'
import { CursorPositionProvider } from '../utils/CursorPosition'

import { ProjectsProvider } from '../contexts/ProjectsContext'

import { ShareSecretProvider } from '../sharesecret/ShareSecretContext'

import { AIContextProvider } from 'components/ai/AIContext'
import { FeatureFlagProvider } from 'components/flows/FeatureFlagContext'
import { useTheme } from 'styled-components'
import { CloudConsoleWelcomeModal } from '../cloud-setup/CloudConsoleWelcomeModal'
import Header from './Header'
import { ContentOverlay } from './Overlay'
import Sidebar from './Sidebar'
import Subheader from './Subheader'
import WithApplicationUpdate from './WithApplicationUpdate'

export default function Console() {
  return (
    <CursorPositionProvider>
      <MarkdocContextProvider value={{ variant: 'console' }}>
        <ConsoleNavContextProvider>
          <EnsureLogin>
            <ProjectsProvider>
              <BillingSubscriptionProvider>
                <BreadcrumbsProvider>
                  <TerminalThemeProvider>
                    <ShareSecretProvider>
                      <DeploymentSettingsProvider>
                        <AIContextProvider>
                          <FeatureFlagProvider>
                            <ConsoleContent />
                          </FeatureFlagProvider>
                        </AIContextProvider>
                      </DeploymentSettingsProvider>
                    </ShareSecretProvider>
                  </TerminalThemeProvider>
                </BreadcrumbsProvider>
              </BillingSubscriptionProvider>
            </ProjectsProvider>
          </EnsureLogin>
        </ConsoleNavContextProvider>
      </MarkdocContextProvider>
    </CursorPositionProvider>
  )
}

function ConsoleContent() {
  const isProduction = import.meta.env.MODE === 'production'
  const theme = useTheme()
  const isCloudSetupUnfinished = useCloudSetupUnfinished()

  return (
    <Flex
      position="relative"
      height="100%"
      minHeight="0"
      maxHeight="100vh"
      overflow="hidden"
      flexDirection="column"
      flexGrow={1}
    >
      {isProduction && (
        <WithApplicationUpdate>
          {({ reloadApplication }) => (
            <Toast
              severity="info"
              marginBottom="medium"
              marginRight="xxxxlarge"
            >
              <span css={{ marginRight: theme.spacing.small }}>
                Time for a new update!
              </span>
              <a
                onClick={() => reloadApplication()}
                style={{
                  textDecoration: 'none',
                  cursor: 'pointer',
                  color: theme.colors['action-link-inline'],
                }}
              >
                Update now
              </a>
            </Toast>
          )}
        </WithApplicationUpdate>
      )}
      {isCloudSetupUnfinished && <CloudConsoleWelcomeModal />}
      <Header />
      <Flex
        width="100%"
        minWidth={0}
        minHeight={0}
        flexGrow={1}
        alignItems="stretch"
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
          <Suspense fallback={<LoadingIndicator />}>
            <Outlet />
          </Suspense>
        </Flex>
      </Flex>
    </Flex>
  )
}
