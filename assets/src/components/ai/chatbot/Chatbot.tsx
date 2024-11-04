import {
  ChatOutlineIcon,
  ExpandIcon,
  Flex,
  GearTrainIcon,
  HistoryIcon,
  IconFrame,
  ModalWrapper,
  ShrinkIcon,
} from '@pluralsh/design-system'

import * as Dialog from '@radix-ui/react-dialog'

import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import { AiInsight, ChatThreadFragment } from 'generated/graphql'
import { ComponentPropsWithRef } from 'react'
import { VisuallyHidden } from 'react-aria'
import { useNavigate } from 'react-router-dom'
import { GLOBAL_SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'
import styled, { useTheme } from 'styled-components'
import { useChatbot, useChatbotContext } from '../AIContext.tsx'
import { ChatbotIconButton } from './ChatbotButton.tsx'
import { ChatbotPanelInsight } from './ChatbotPanelInsight.tsx'
import { ChatbotPanelThread } from './ChatbotPanelThread.tsx'
import { AllThreadsTable } from '../AIThreadsTable.tsx'
import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext.tsx'

type ChatbotPanelInnerProps = ComponentPropsWithRef<typeof ChatbotFrameSC> & {
  fullscreen: boolean
  onClose: () => void
  currentThread?: Nullable<ChatThreadFragment>
  currentInsight?: Nullable<AiInsight>
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

function ChatbotHeader({
  onClose,
  fullscreen,
}: {
  onClose: () => void
  fullscreen: boolean
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { goToThreadList, setFullscreen } = useChatbot()
  return (
    <ChatbotHeaderSC $fullscreen={fullscreen}>
      <Flex
        gap="xsmall"
        align="center"
      >
        <ChatOutlineIcon color={theme.colors['icon-primary']} />
        <Body2BoldP css={{ flex: 1 }}>Ask AI</Body2BoldP>
        <IconFrame
          clickable
          tooltip="See history"
          onClick={goToThreadList}
          size="small"
          icon={<HistoryIcon />}
        />
        <IconFrame
          clickable
          tooltip="Go to settings"
          onClick={() => {
            onClose()
            navigate(`${GLOBAL_SETTINGS_ABS_PATH}/ai-provider`)
          }}
          size="small"
          icon={<GearTrainIcon />}
        />
        <IconFrame
          clickable
          onClick={() => setFullscreen((prev) => !prev)}
          size="small"
          icon={fullscreen ? <ShrinkIcon /> : <ExpandIcon />}
        />
        <IconFrame
          clickable
          size="small"
          icon={LineIcon}
          onClick={onClose}
        />
      </Flex>
      <CaptionP $color="text-xlight">
        AI is prone to mistakes, always test changes before application.
      </CaptionP>
    </ChatbotHeaderSC>
  )
}

const ChatbotHeaderSC = styled.div<{ $fullscreen: boolean }>(
  ({ $fullscreen, theme }) => ({
    ...($fullscreen && {
      border: theme.borders.input,
      borderRadius: theme.borderRadiuses.large,
    }),
    backgroundColor: $fullscreen
      ? theme.colors['fill-one']
      : theme.colors['fill-two'],
    padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xxsmall,
  })
)

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

const LineIcon = (
  <svg
    width="16"
    height="2"
  >
    <path
      d="M1 1H15"
      stroke="#F1F3F3"
      strokeWidth="1.5"
    />
  </svg>
)
