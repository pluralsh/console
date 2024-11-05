import { ChatOutlineIcon, ModalWrapper } from '@pluralsh/design-system'

import * as Dialog from '@radix-ui/react-dialog'

import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext.tsx'
import { AiInsightFragment, ChatThreadFragment } from 'generated/graphql'
import { ComponentPropsWithRef } from 'react'
import { VisuallyHidden } from 'react-aria'
import styled, { useTheme } from 'styled-components'
import { useChatbotContext } from '../AIContext.tsx'
import { AllThreadsTable } from '../AIThreadsTable.tsx'
import { ChatbotIconButton } from './ChatbotButton.tsx'
import { ChatbotHeader } from './ChatbotHeader.tsx'
import { ChatbotPanelInsight } from './ChatbotPanelInsight.tsx'
import { ChatbotPanelThread } from './ChatbotPanelThread.tsx'

type ChatbotPanelInnerProps = ComponentPropsWithRef<typeof ChatbotFrameSC> & {
  fullscreen: boolean
  onClose: () => void
  currentThread?: Nullable<ChatThreadFragment>
  currentInsight?: Nullable<AiInsightFragment>
}

export function Chatbot() {
  const { open, setOpen, fullscreen, currentThread, currentInsight } =
    useChatbotContext()
  const settings = useDeploymentSettings()

  if (!settings.ai?.enabled) {
    return null
  }

  return (
    <div css={{ position: 'relative' }}>
      <ChatbotIconButton
        active={open}
        onClick={() => setOpen(true)}
      >
        <ChatOutlineIcon />
      </ChatbotIconButton>
      <ChatbotPanel
        fullscreen={fullscreen}
        open={open}
        onClose={() => setOpen(false)}
        currentThread={currentThread}
        currentInsight={currentInsight}
      />
    </div>
  )
}

export function ChatbotPanel({
  open,
  fullscreen = false,
  onClose,
  ...props
}: {
  open: boolean
} & ChatbotPanelInnerProps) {
  const theme = useTheme()
  return (
    <ModalWrapper
      overlayStyles={
        fullscreen
          ? {}
          : {
              background: 'none',
              padding: theme.spacing.medium,
              top: theme.spacing.xxxxlarge,
              left: 'unset',
            }
      }
      css={{ height: '100%' }}
      open={open}
      onOpenChange={onClose}
    >
      <ChatbotPanelInner
        fullscreen={fullscreen}
        onClose={onClose}
        {...props}
      />
      {/* required for accessibility */}
      <VisuallyHidden>
        <Dialog.Title>Ask Plural AI</Dialog.Title>
      </VisuallyHidden>
    </ModalWrapper>
  )
}

function ChatbotPanelInner({
  fullscreen,
  onClose,
  currentThread,
  currentInsight,
  ...props
}: ChatbotPanelInnerProps) {
  return (
    <ChatbotFrameSC
      $fullscreen={fullscreen}
      {...props}
    >
      <ChatbotHeader
        onClose={onClose}
        fullscreen={fullscreen}
        currentThread={currentThread}
        currentInsight={currentInsight}
      />
      {currentThread ? (
        <ChatbotPanelThread
          currentThread={currentThread}
          fullscreen={fullscreen}
        />
      ) : currentInsight ? (
        <ChatbotPanelInsight
          currentInsight={currentInsight}
          fullscreen={fullscreen}
        />
      ) : (
        <AllThreadsTable />
      )}
    </ChatbotFrameSC>
  )
}

const ChatbotFrameSC = styled.div<{ $fullscreen?: boolean }>(
  ({ $fullscreen, theme }) => ({
    ...($fullscreen
      ? {
          gap: theme.spacing.medium,
        }
      : {
          border: theme.borders['fill-two'],
          borderRadius: theme.borderRadiuses.large,
        }),
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
    width: $fullscreen ? '75vw' : 768,
  })
)
