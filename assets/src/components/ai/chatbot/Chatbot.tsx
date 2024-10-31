import {
  Card,
  ChatOutlineIcon,
  DropdownArrowIcon,
  ExpandIcon,
  Flex,
  GearTrainIcon,
  HistoryIcon,
  IconFrame,
  ModalWrapper,
} from '@pluralsh/design-system'

import * as Dialog from '@radix-ui/react-dialog'

import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import { ChatThreadFragment } from 'generated/graphql'
import { ComponentPropsWithRef } from 'react'
import { VisuallyHidden } from 'react-aria'
import { useNavigate } from 'react-router-dom'
import { GLOBAL_SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'
import styled, { useTheme } from 'styled-components'
import { useChatbot, useChatbotContext } from '../AIContext.tsx'
import { ChatbotIconButton } from './ChatbotButton.tsx'
import { ChatbotPanelThread } from './ChatbotPanelThread.tsx'
import { AIThreadsTable } from '../AIThreadsTable.tsx'

type ChatbotPanelInnerProps = ComponentPropsWithRef<typeof ChatbotFrameSC> & {
  fullscreen?: boolean
  onClose: () => void
  currentThread?: Nullable<ChatThreadFragment>
}

export function Chatbot() {
  const { open, setOpen, fullscreen, currentThread } = useChatbotContext()

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
      css={{ width: '100%', height: '100%' }}
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
  ...props
}: ChatbotPanelInnerProps) {
  return (
    <ChatbotFrameSC
      $fullscreen={fullscreen}
      fillLevel={1}
      {...props}
    >
      <ChatbotHeader onClose={onClose} />
      {currentThread ? (
        <ChatbotPanelThread currentThread={currentThread} />
      ) : (
        <AIThreadsTable />
      )}
    </ChatbotFrameSC>
  )
}

function ChatbotHeader({ onClose }: { onClose: () => void }) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { goToThreadList, fullscreen, setFullscreen } = useChatbot()
  return (
    <ChatbotHeaderSC>
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
          tooltip={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          onClick={() => setFullscreen((prev) => !prev)}
          size="small"
          icon={fullscreen ? <DropdownArrowIcon /> : <ExpandIcon />}
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

const ChatbotHeaderSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-two'],
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
}))

const ChatbotFrameSC = styled(Card)<{ $fullscreen?: boolean }>(
  ({ $fullscreen }) => ({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: $fullscreen ? '100%' : 560,
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
