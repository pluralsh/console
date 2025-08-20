import { Flex, MarkdocContextProvider } from '@pluralsh/design-system'
import { Suspense, useRef } from 'react'

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

import { CLOSE_CHAT_ACTION_PANEL_EVENT } from 'components/ai/AIAgent'
import { AIContextProvider, useChatbot } from 'components/ai/AIContext'
import { ChatbotPanel } from 'components/ai/chatbot/Chatbot'
import { CommandPaletteProvider } from 'components/commandpalette/CommandPaletteContext'
import { FeatureFlagProvider } from 'components/flows/FeatureFlagContext'
import { useNativeDomEvent } from 'components/hooks/useNativeDomEvent'
import { CloudConsoleWelcomeModal } from '../cloud-setup/CloudConsoleWelcomeModal'
import { ApplicationUpdateToast } from './ApplicationUpdateToast'
import Header from './Header'
import Sidebar from './Sidebar'
import Subheader from './Subheader'

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
                            <CommandPaletteProvider>
                              <ConsoleContent />
                            </CommandPaletteProvider>
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
  const isCloudSetupUnfinished = useCloudSetupUnfinished()
  const { setActionsPanelOpen } = useChatbot()

  // need to do this natively instead of using onPointerDown so that clicking portaled elements like modals don't close the actions panel
  const wrapperRef = useRef<HTMLDivElement>(null)
  useNativeDomEvent(wrapperRef, CLOSE_CHAT_ACTION_PANEL_EVENT, () => {
    setActionsPanelOpen(false)
  })

  return (
    <Flex
      height="100vh"
      flexGrow={1}
      minHeight={0}
      alignItems="stretch"
    >
      <Flex
        ref={wrapperRef}
        position="relative"
        height="100%"
        overflow="hidden"
        flexDirection="column"
        flexGrow={1}
        container="console / inline-size"
        zIndex={0} // needed so chatbot flyovers render over main console content
      >
        {isProduction && <ApplicationUpdateToast />}
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
            <Subheader />
            <Suspense fallback={<LoadingIndicator />}>
              <Outlet />
            </Suspense>
          </Flex>
        </Flex>
      </Flex>
      <ChatbotPanel />
    </Flex>
  )
}
