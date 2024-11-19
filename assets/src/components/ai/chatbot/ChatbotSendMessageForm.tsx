import { SendMessageIcon } from '@pluralsh/design-system'

import usePersistedSessionState from 'components/hooks/usePersistedSessionState'
import { usePlatform } from 'components/hooks/usePlatform'
import { submitForm } from 'components/utils/submitForm'
import {
  ComponentProps,
  forwardRef,
  KeyboardEvent,
  Ref,
  useCallback,
  useState,
} from 'react'
import styled, { useTheme } from 'styled-components'

import { textAreaInsert } from 'components/utils/textAreaInsert'
import { AiRole } from 'generated/graphql'
import { useInterval } from 'usehooks-ts'
import { ChatMessage } from './ChatMessage'
export const SendMessageForm = forwardRef(
  (
    {
      sendMessage,
      fullscreen,
      ...props
    }: {
      sendMessage: (newMessage: string) => void
      fullscreen: boolean
    } & ComponentProps<'textarea'>,
    ref: Ref<HTMLTextAreaElement>
  ) => {
    const { isMac } = usePlatform()
    const onKeyDown = useCallback(
      (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          let modKeyPressed = e.shiftKey || e.ctrlKey || e.altKey

          if (isMac) {
            modKeyPressed = modKeyPressed || e.metaKey
          }
          if (modKeyPressed) {
            textAreaInsert(e.currentTarget, '\n')
          } else {
            submitForm(e.currentTarget?.form)
          }
        }
      },
      [isMac]
    )
    const [newMessage, setNewMessage] = usePersistedSessionState<string>(
      'currentAiChatMessage',
      ''
    )

    return (
      <SendMessageFormSC
        onSubmit={(e) => {
          e.preventDefault()
          sendMessage(newMessage)
          setNewMessage('')
        }}
        $fullscreen={fullscreen}
      >
        <ChatbotTextAreaWrapperSC $fullscreen={fullscreen}>
          <ChatbotTextAreaSC
            placeholder="Ask Plural AI"
            value={newMessage}
            onChange={(e) => setNewMessage(e.currentTarget.value)}
            ref={ref}
            {...props}
            onKeyDown={onKeyDown}
          />
          <SendMessageButtonSC type="submit">
            <SendMessageIcon />
          </SendMessageButtonSC>
        </ChatbotTextAreaWrapperSC>
      </SendMessageFormSC>
    )
  }
)

export function GeneratingResponseMessage() {
  const theme = useTheme()
  const [dots, setDots] = useState('.')

  useInterval(() => {
    setDots((prev) => {
      if (prev === '.') return '..'
      if (prev === '..') return '...'
      return '.'
    })
  }, 240)

  return (
    <ChatMessage
      content={`Generating response${dots}`}
      role={AiRole.Assistant}
      disableActions
      contentStyles={{ alignSelf: 'center', color: theme.colors['text-light'] }}
    />
  )
}

const SendMessageFormSC = styled.form<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    ...($fullscreen && {
      border: theme.borders.input,
    }),
    position: 'relative',
    borderRadius: $fullscreen ? theme.borderRadiuses.large : '0px',
    backgroundColor: $fullscreen
      ? theme.colors['fill-one']
      : theme.colors['fill-two'],
    borderTop: $fullscreen ? undefined : theme.borders['fill-two'],
    padding: theme.spacing.medium,
  })
)

const ChatbotTextAreaWrapperSC = styled.div<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    display: 'flex',
    gap: theme.spacing.medium,
    borderRadius: theme.borderRadiuses.large,
    backgroundColor: $fullscreen
      ? theme.colors['fill-two']
      : theme.colors['fill-three'],
    '&:has(textarea:focus)': {
      outline: theme.borders['outline-focused'],
    },
  })
)

const ChatbotTextAreaSC = styled.textarea(({ theme }) => ({
  ...theme.partials.text.body2,
  flex: 1,
  padding: `${theme.spacing.medium}px 0 0 ${theme.spacing.small}px`,
  backgroundColor: 'transparent',
  border: 'none',
  outline: 'none',
  resize: 'none',
  color: theme.colors.text,
}))

const SendMessageButtonSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  padding: theme.spacing.small,
  '&:hover': {
    backgroundColor: theme.colors['fill-three-selected'],
  },
}))
