import {
  Card,
  IconFrame,
  Layer,
  SendMessageIcon,
} from '@pluralsh/design-system'
import moment from 'moment/moment'
import { ReactNode, useRef } from 'react'
import styled, { useTheme } from 'styled-components'
import { useChatbotContext } from '../AIContext.tsx'
import { ChatbotPanelThread } from './ChatbotPanelThread.tsx'

function ChatbotFullscreenUnstyled({ open, onClose, ...props }): ReactNode {
  const { currentThread } = useChatbotContext()

  return (
    <Layer
      modal
      open={open}
      position="center"
      onClose={onClose}
      onClickOutside={onClose}
    >
      <div {...props}>
        <Card className="header">
          <span className="title">{currentThread?.summary}</span>
          <span className="timestamp">
            Last updated {moment(currentThread?.updatedAt).fromNow()}
          </span>
        </Card>
        <Card className="content">
          {currentThread ? (
            <ChatbotPanelThread
              currentThread={currentThread}
              detached={true}
            />
          ) : (
            <div>TODO: select thread</div>
          )}
        </Card>
        <Card className="chat">
          <ChatbotTextArea />
        </Card>
      </div>
    </Layer>
  )
}

function ChatbotTextArea(): ReactNode {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const theme = useTheme()

  return (
    <span
      css={{
        height: '100%',
        display: 'flex',
        padding: `${theme.spacing.medium}px ${theme.spacing.small}px`,
      }}
    >
      <ChatbotTextAreaSC
        ref={inputRef}
        placeholder="Ask Plural AI a question"
      ></ChatbotTextAreaSC>
      <IconFrame
        clickable
        icon={<SendMessageIcon />}
        css={{
          alignSelf: 'center',
        }}
        onClick={() => {}} // TODO
      />
    </span>
  )
}

export const ChatbotFullscreen = styled(ChatbotFullscreenUnstyled)(
  ({ theme }) => ({
    maxWidth: 768,
    width: 768,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.medium,
    padding: `${theme.spacing.xxxlarge}px 0`,

    '.header': {
      height: 72,
      padding: theme.spacing.medium,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'space-between',

      '.title': {
        ...theme.partials.text.body1Bold,

        minWidth: '200px',
        width: '40%',
        maxWidth: '40%',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      },

      '.timestamp': {
        ...theme.partials.text.caption,
        color: theme.colors['text-xlight'],
      },
    },

    '.content': {
      flexGrow: 1,
      background: theme.colors['fill-one'],
      overflow: 'auto',
    },

    '.chat': {
      height: 52,
      background: theme.colors['fill-two'],
    },
  })
)

const ChatbotTextAreaSC = styled.textarea(({ theme }) => ({
  ...theme.partials.text.body2,
  width: '100%',
  height: '100%',
  backgroundColor: 'transparent',
  border: 'none',
  outline: 'none',
  resize: 'none',
  color: theme.colors.text,
  padding: 0,
  lineHeight: '18px',
}))
