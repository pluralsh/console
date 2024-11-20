import { SendMessageIcon } from '@pluralsh/design-system'
import usePersistedSessionState from 'components/hooks/usePersistedSessionState'
import { AiRole } from 'generated/graphql'
import {
  ClipboardEvent,
  ComponentProps,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import styled, { useTheme } from 'styled-components'
import { useInterval } from 'usehooks-ts'
import { ChatMessage } from './ChatMessage'

export function SendMessageForm({
  sendMessage,
  fullscreen,
  ...props
}: {
  sendMessage: (newMessage: string) => void
  fullscreen: boolean
} & ComponentProps<'div'>) {
  const [newMessage, setNewMessage] = usePersistedSessionState<string>(
    'currentAiChatMessage',
    ''
  )

  const contentEditableRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // focus input on initial mount
  useLayoutEffect(() => {
    contentEditableRef.current?.focus()
  }, [])

  const onInput = useCallback(
    (e: FormEvent<HTMLDivElement>) => {
      const content = e.currentTarget.innerText || ''
      setNewMessage(content)
      // clears so placeholder is shown if input is only a newline
      if (content === '\n') e.currentTarget.innerHTML = ''
    },
    [setNewMessage]
  )

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    // for handling enter key
    // if any modifier key is pressed, allow default behavior (which is adding a new line usually)
    // otherwise, submit the form
    if (e.key === 'Enter') {
      if (e.shiftKey || e.ctrlKey || e.altKey) return
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }, [])

  const onPaste = useCallback(
    (e: ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      const text = e.clipboardData?.getData('text/plain')
      // take the current selection, remove whatever's there if anything, and insert the pasted text
      const selection = document.getSelection()
      if (!selection?.rangeCount || !text) return
      selection.deleteFromDocument()
      selection.getRangeAt(0).insertNode(document.createTextNode(text))
      selection.collapseToEnd()
      setNewMessage(text)
    },
    [setNewMessage]
  )

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const content = newMessage.trim()
      if (content) {
        sendMessage(content)
        setNewMessage('')
        if (contentEditableRef.current) {
          contentEditableRef.current.innerText = ''
        }
      }
    },
    [newMessage, sendMessage, setNewMessage]
  )

  return (
    <SendMessageFormSC
      onSubmit={handleSubmit}
      $fullscreen={fullscreen}
      ref={formRef}
    >
      <EditableContentWrapperSC $fullscreen={fullscreen}>
        <EditableContentSC
          contentEditable
          data-placeholder="Ask Plural AI"
          onInput={onInput}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          ref={contentEditableRef}
          {...props}
        />
        <SendMessageButtonSC
          type="submit"
          disabled={!newMessage.trim()}
        >
          <SendMessageIcon />
        </SendMessageButtonSC>
      </EditableContentWrapperSC>
    </SendMessageFormSC>
  )
}

const SendMessageFormSC = styled.form<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    position: 'relative',
    borderRadius: $fullscreen ? theme.borderRadiuses.large : '0px',
    backgroundColor: $fullscreen
      ? theme.colors['fill-one']
      : theme.colors['fill-two'],
    borderTop: $fullscreen ? undefined : theme.borders['fill-two'],
    padding: theme.spacing.medium,
    ...($fullscreen && {
      border: theme.borders.input,
    }),
  })
)

const EditableContentWrapperSC = styled.div<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    display: 'flex',
    gap: theme.spacing.medium,
    borderRadius: theme.borderRadiuses.large,
    backgroundColor: $fullscreen
      ? theme.colors['fill-two']
      : theme.colors['fill-three'],
    '&:has(div:focus)': {
      outline: theme.borders['outline-focused'],
    },
  })
)

const EditableContentSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  flex: 1,
  padding: theme.spacing.small,
  border: 'none',
  outline: 'none',
  overflowY: 'auto',
  maxHeight: '176px',
  whiteSpace: 'pre-wrap',
  '&:empty:before': {
    content: 'attr(data-placeholder)',
    color: theme.colors['text-light'],
    pointerEvents: 'none',
  },
}))

const SendMessageButtonSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  padding: theme.spacing.small,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover:not(:disabled)': {
    cursor: 'pointer',
    backgroundColor: theme.colors['fill-three-selected'],
  },
  '&:disabled': {
    opacity: 0.5,
  },
}))

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
