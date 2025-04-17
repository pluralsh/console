import {
  Button,
  Chip,
  Flex,
  IconFrame,
  PlusIcon,
  PrOpenIcon,
  SendMessageIcon,
  ServersIcon,
  Tooltip,
} from '@pluralsh/design-system'
import usePersistedSessionState from 'components/hooks/usePersistedSessionState'
import { GqlError } from 'components/utils/Alert'
import { EditableDiv } from 'components/utils/EditableDiv'
import {
  AiRole,
  ChatThreadTinyFragment,
  useAddChatContextMutation,
  useThreadPrMutation,
} from 'generated/graphql'
import { truncate } from 'lodash'
import {
  ComponentPropsWithoutRef,
  FormEvent,
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
  shouldUseMCP,
  serverNames,
  showMcpServers,
  setShowMcpServers,
  ...props
}: {
  currentThread: ChatThreadTinyFragment
  sendMessage: (newMessage: string) => void
  fullscreen: boolean
  shouldUseMCP: boolean
  serverNames: string[]
  showMcpServers: boolean
  setShowMcpServers: (show: boolean) => void
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

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const content = newMessage.trim()
      if (content) {
        sendMessage(content)
        setNewMessage('')
        if (contentEditableRef.current)
          contentEditableRef.current.innerText = ''
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
      {shouldUseMCP && (
        <Flex
          justify="space-between"
          align="center"
          gap="small"
        >
          <ChipListSC>
            {serverNames.slice(0, 4).map((serverName) => (
              <Chip
                key={serverName}
                size="small"
                css={{ minWidth: 'fit-content' }}
              >
                {truncate(serverName, { length: 14 })}
              </Chip>
            ))}
            {serverNames.length > 4 && (
              <Chip size="small">+{serverNames.length - 4}</Chip>
            )}
          </ChipListSC>
          <Button
            small
            secondary
            startIcon={showMcpServers ? null : <ServersIcon />}
            onClick={() => setShowMcpServers(!showMcpServers)}
          >
            {showMcpServers ? 'Collapse MCP servers' : 'Expand MCP servers'}
          </Button>
        </Flex>
      )}
      <EditableContentWrapperSC $fullscreen={fullscreen}>
        {contextError && <GqlError error={contextError} />}
        {threadPrError && <GqlError error={threadPrError} />}
        <EditableDiv
          placeholder="Start typing..."
          setValue={setNewMessage}
          initialValue={newMessage}
          onEnter={() => formRef.current?.requestSubmit()}
          css={{ maxHeight: 176 }}
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
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.small,
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

const ChipListSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xsmall,
  maxWidth: 256,
  minWidth: 0,
}))
