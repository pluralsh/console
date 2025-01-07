import {
  Button,
  Flex,
  IconFrame,
  PlusIcon,
  PrOpenIcon,
  SendMessageIcon,
  Tooltip,
} from '@pluralsh/design-system'
import usePersistedSessionState from 'components/hooks/usePersistedSessionState'
import { GqlError } from 'components/utils/Alert'
import {
  AiRole,
  ChatThreadFragment,
  useAddChatContextMutation,
  useThreadPrMutation,
} from 'generated/graphql'
import {
  ClipboardEvent,
  ComponentPropsWithoutRef,
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
import { useCurrentPageChatContext } from './useCurrentPageChatContext'

export function SendMessageForm({
  currentThread,
  sendMessage,
  fullscreen,
  ...props
}: {
  currentThread: ChatThreadFragment
  sendMessage: (newMessage: string) => void
  fullscreen: boolean
} & ComponentPropsWithoutRef<'div'>) {
  const { sourceId, source } = useCurrentPageChatContext()
  const showContextBtn = !!source && !!sourceId
  const [contextBtnClicked, setContextBtnClicked] = useState(false)
  const [threadPrBtnClicked, setThreadPrBtnClicked] = useState(false)
  const [newMessage, setNewMessage] = usePersistedSessionState<string>(
    'currentAiChatMessage',
    ''
  )

  const [addChatContext, { loading: contextLoading, error: contextError }] =
    useAddChatContextMutation({
      awaitRefetchQueries: true,
      refetchQueries: ['ChatThreadDetails'],
      onCompleted: () => {
        setContextBtnClicked(true)
      },
    })

  const [createThreadPr, { loading: threadPrLoading, error: threadPrError }] =
    useThreadPrMutation({
      awaitRefetchQueries: true,
      refetchQueries: ['ChatThreadDetails'],
    })

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

  const handleAddPageContext = useCallback(() => {
    setContextBtnClicked(true)
    if (showContextBtn)
      addChatContext({
        variables: { source, sourceId, threadId: currentThread.id },
      })
  }, [addChatContext, currentThread.id, showContextBtn, source, sourceId])

  const handleCreateThreadPr = useCallback(() => {
    setThreadPrBtnClicked(true)
    createThreadPr({ variables: { threadId: currentThread.id } })
  }, [createThreadPr, currentThread.id])

  return (
    <SendMessageFormSC
      onSubmit={handleSubmit}
      $fullscreen={fullscreen}
      ref={formRef}
    >
      <EditableContentWrapperSC $fullscreen={fullscreen}>
        {contextError && <GqlError error={contextError} />}
        {threadPrError && <GqlError error={threadPrError} />}
        <EditableContentSC
          contentEditable
          data-placeholder="Start typing..."
          onInput={onInput}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          {...props}
          ref={contentEditableRef}
        />
        <Flex justifyContent="space-between">
          <Flex
            gap="small"
            height="100%"
          >
            {showContextBtn && (
              <Tooltip
                label={`Appends prompts and files related to the ${source.toLowerCase()} currently being viewed`}
                placement="top"
              >
                <Button
                  small
                  secondary
                  disabled={contextBtnClicked}
                  loading={contextLoading}
                  onClick={handleAddPageContext}
                  startIcon={<PlusIcon />}
                >
                  Add page context
                </Button>
              </Tooltip>
            )}
            <Button
              small
              secondary
              disabled={threadPrBtnClicked}
              loading={threadPrLoading}
              onClick={handleCreateThreadPr}
              startIcon={<PrOpenIcon />}
            >
              Create PR
            </Button>
          </Flex>
          <IconFrame
            icon={<SendMessageIcon />}
            clickable
            type="secondary"
            css={{ '&:disabled': { opacity: 0.5 } }}
            disabled={!newMessage.trim()}
            onClick={() => {
              formRef.current?.requestSubmit()
            }}
          />
        </Flex>
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
    flexDirection: 'column',
    gap: theme.spacing.small,
    padding: theme.spacing.small,
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
