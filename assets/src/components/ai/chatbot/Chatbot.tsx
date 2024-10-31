import {
  Card,
  ChatIcon,
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
import { ChatbotFullscreen } from './ChatbotFullscreen.tsx'
import { ChatbotPanelThread } from './ChatbotPanelThread.tsx'
import { ChatbotPanelThreadList } from './ChatbotPanelThreadList.tsx'

type ChatbotPanelInnerProps = ComponentPropsWithRef<typeof ChatbotFrameSC> & {
  onClose: () => void
  currentThread: Nullable<ChatThreadFragment>
}

export function Chatbot() {
  const { open, setOpen, fullscreen, setFullscreen, currentThread } =
    useChatbotContext()

  return (
    <div css={{ position: 'relative' }}>
      <ChatbotIconButton
        active={open}
        onClick={() => setOpen(true)}
      >
        <ChatIcon />
      </ChatbotIconButton>
      <ChatbotPanel
        open={open && !fullscreen}
        onClose={() => setOpen(false)}
        currentThread={currentThread}
      />
      <ChatbotFullscreen
        open={open && fullscreen}
        onClose={() => setFullscreen(false)}
      ></ChatbotFullscreen>
    </div>
  )
}

export function ChatbotPanel({
  open,
  onClose,
  ...props
}: {
  open: boolean & ChatbotPanelInnerProps
}) {
  const theme = useTheme()
  return (
    <ModalWrapper
      overlayStyles={{
        background: 'none',
        padding: theme.spacing.medium,
        top: theme.spacing.xxxxlarge,
        left: 'unset',
      }}
      css={{ height: '100%' }}
      open={open}
      onOpenChange={onClose}
    >
      <ChatbotPanelInner
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
  onClose,
  currentThread,
  ...props
}: ChatbotPanelInnerProps) {
  return (
    <ChatbotFrameSC
      fillLevel={1}
      {...props}
    >
      <ChatbotHeader onClose={onClose} />
      {currentThread ? (
        <ChatbotPanelThread currentThread={currentThread} />
      ) : (
        <ChatbotPanelThreadList />
      )}
    </ChatbotFrameSC>
  )
}

function ChatbotHeader({ onClose }: { onClose: () => void }) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { goToThreadList, openFullscreen } = useChatbot()
  return (
    <ChatbotHeaderSC>
      <Flex
        gap="xsmall"
        align="center"
      >
        <ChatIcon color={theme.colors['icon-primary']} />
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
          tooltip="Fullscreen view"
          onClick={openFullscreen}
          size="small"
          icon={<ExpandIcon />}
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

const ChatbotFrameSC = styled(Card)(() => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: 560,
}))

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
