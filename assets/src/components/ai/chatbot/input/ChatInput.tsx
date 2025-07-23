import {
  AiSparkleFilledIcon,
  Chip,
  Flex,
  IconFrame,
  PlusIcon,
  SendMessageIcon,
  ServersIcon,
} from '@pluralsh/design-system'
import usePersistedSessionState from 'components/hooks/usePersistedSessionState.tsx'
import { GqlError } from 'components/utils/Alert.tsx'
import { EditableDiv } from 'components/utils/EditableDiv.tsx'
import {
  AgentSessionType,
  AiRole,
  ChatThreadTinyFragment,
  useAddChatContextMutation,
  useCloudConnectionsQuery,
} from 'generated/graphql.ts'
import { isEmpty, truncate } from 'lodash'
import {
  ComponentPropsWithoutRef,
  Dispatch,
  FormEvent,
  SetStateAction,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import styled, { useTheme } from 'styled-components'
import { useInterval } from 'usehooks-ts'
import { ChatMessage } from '../ChatMessage.tsx'
import { useCurrentPageChatContext } from '../useCurrentPageChatContext.tsx'
import { ChatInputIconFrame } from './ChatInputIconFrame.tsx'
import { ChatInputAgentSelect } from './ChatInputAgentSelect.tsx'
import { ChatInputClusterSelect } from './ChatInputClusterSelect.tsx'

export function ChatInput({
  currentThread,
  sendMessage,
  serverNames,
  showMcpServers,
  setShowMcpServers,
  showPrompts,
  setShowPrompts,
  ...props
}: {
  currentThread: ChatThreadTinyFragment
  sendMessage: (newMessage: string) => void
  serverNames: string[]
  showMcpServers: boolean
  setShowMcpServers: Dispatch<SetStateAction<boolean>>
  showPrompts: boolean
  setShowPrompts: Dispatch<SetStateAction<boolean>>
} & ComponentPropsWithoutRef<'div'>) {
  const { sourceId, source } = useCurrentPageChatContext()
  const showContextBtn = !!source && !!sourceId
  const [contextBtnClicked, setContextBtnClicked] = useState(false)
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

  const { data: cloudConnections, loading: cloudConnectionsLoading } =
    useCloudConnectionsQuery()
  const connectionId = cloudConnections?.cloudConnections?.edges?.[0]?.node?.id

  const hideClusterSelector =
    currentThread?.session?.type === AgentSessionType.Kubernetes ||
    currentThread?.session?.type === AgentSessionType.Terraform ||
    !currentThread?.session?.id

  return (
    <SendMessageFormSC
      onSubmit={handleSubmit}
      ref={formRef}
    >
      {!isEmpty(serverNames) && (
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
        </Flex>
      )}
      <EditableContentWrapperSC>
        {contextError && <GqlError error={contextError} />}
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
            gap="xxsmall"
            align="flex-end"
          >
            {showContextBtn && (
              <ChatInputIconFrame
                disabled={contextBtnClicked}
                loading={contextLoading}
                icon={<PlusIcon />}
                onClick={handleAddPageContext}
                tooltip={`Append prompts and files related to the ${source.toLowerCase()} currently being viewed`}
              />
            )}
            <ChatInputIconFrame
              active={showPrompts}
              icon={<AiSparkleFilledIcon />}
              tooltip={`${showPrompts ? 'Hide' : 'Show'} example prompts`}
              onClick={() => setShowPrompts(!showPrompts)}
            />
            {!isEmpty(serverNames) && (
              <ChatInputIconFrame
                icon={<ServersIcon />}
                tooltip={`${showMcpServers ? 'Collapse' : 'Expand'} MCP servers`}
                onClick={() => setShowMcpServers(!showMcpServers)}
              />
            )}
            {!cloudConnectionsLoading && (
              <>
                {connectionId && (
                  <ChatInputAgentSelect connectionId={connectionId} />
                )}
                {!hideClusterSelector && (
                  <ChatInputClusterSelect currentThread={currentThread} />
                )}
              </>
            )}
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

const SendMessageFormSC = styled.form(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  position: 'relative',
  padding: theme.spacing.medium,
}))

const EditableContentWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.small,
  borderRadius: theme.borderRadiuses.large,
  backgroundColor: theme.colors['fill-zero'],
  border: theme.borders.input,

  '&:has(div:focus)': {
    backgroundColor: theme.colors['fill-zero-selected'],
    outline: theme.borders['outline-focused'],
  },
}))

const ChipListSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xsmall,
  maxWidth: 256,
  minWidth: 0,
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
