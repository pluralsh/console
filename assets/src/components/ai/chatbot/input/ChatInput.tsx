import {
  AiSparkleFilledIcon,
  ArrowUpIcon,
  Button,
  CaretDownIcon,
  Chip,
  Flex,
  PlusIcon,
  RobotIcon,
  SemanticColorKey,
  SendMessageIcon,
  ServersIcon,
  SpinnerAlt,
} from '@pluralsh/design-system'
import usePersistedSessionState from 'components/hooks/usePersistedSessionState.tsx'
import { GqlError } from 'components/utils/Alert.tsx'
import { EditableDiv } from 'components/utils/EditableDiv.tsx'
import { SemanticPartialType } from 'components/utils/table/StackedText.tsx'
import {
  ChatThreadDetailsFragment,
  useAddChatContextMutation,
} from 'generated/graphql.ts'
import { isEmpty, truncate } from 'lodash'
import {
  ComponentPropsWithRef,
  Dispatch,
  FormEvent,
  ReactNode,
  SetStateAction,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { mergeRefs } from 'react-merge-refs'
import styled, { useTheme } from 'styled-components'
import { useChatbot } from '../../AIContext.tsx'
import { useCurrentPageChatContext } from '../useCurrentPageChatContext.tsx'
import { ChatInputCloudSelect } from './ChatInputCloudSelect.tsx'
import { ChatInputClusterSelect } from './ChatInputClusterSelect.tsx'
import { ChatInputIconFrame } from './ChatInputIconFrame.tsx'

export function ChatInput({
  ref,
  currentThread,
  sendMessage,
  serverNames,
  enableExamplePrompts = true,
  showPrompts,
  setShowPrompts,
  placeholder = 'Start typing...',
  onValueChange,
  stateless = false,
  ...props
}: {
  currentThread?: Nullable<ChatThreadDetailsFragment>
  sendMessage: (newMessage: string) => void
  serverNames?: string[]
  enableExamplePrompts?: boolean
  showPrompts?: boolean
  setShowPrompts?: Dispatch<SetStateAction<boolean>>
  placeholder?: string
  onValueChange?: Dispatch<string>
  stateless?: boolean
} & Partial<ComponentPropsWithRef<typeof EditableDiv>>) {
  const { selectedAgent, mcpPanelOpen, setMcpPanelOpen } = useChatbot()

  const { sourceId, source } = useCurrentPageChatContext()
  const showContextBtn = !!source && !!sourceId
  const [contextBtnClicked, setContextBtnClicked] = useState(false)
  const [localMessage, setLocalMessage] = useState<string>('')
  const [persistedMessage, setPersistedMessage] =
    usePersistedSessionState<string>('currentAiChatMessage', '')

  const newMessage = stateless ? localMessage : persistedMessage
  const setNewMessage = stateless ? setLocalMessage : setPersistedMessage

  const [addChatContext, { loading: contextLoading, error: contextError }] =
    useAddChatContextMutation({
      awaitRefetchQueries: true,
      refetchQueries: ['ChatThreadDetails', 'ChatThreadMessages'],
      onCompleted: () => setContextBtnClicked(true),
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
    if (showContextBtn && currentThread)
      addChatContext({
        variables: { source, sourceId, threadId: currentThread.id },
      })
  }, [addChatContext, currentThread, showContextBtn, source, sourceId])

  return (
    <SendMessageFormSC
      className="plrl-chat-input-form"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      {serverNames && serverNames.length > 0 && (
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
      <EditableContentWrapperSC
        $agent={!!selectedAgent}
        $bgColor="fill-zero"
      >
        {contextError && <GqlError error={contextError} />}
        <EditableDiv
          placeholder={placeholder}
          setValue={(value) => {
            setNewMessage(value)
            onValueChange?.(value)
          }}
          initialValue={newMessage}
          onEnter={() => formRef.current?.requestSubmit()}
          css={{ maxHeight: 130 }}
          {...props}
          ref={mergeRefs([contentEditableRef, ref])}
        />
        <Flex justifyContent="space-between">
          <Flex
            gap="xxsmall"
            align="flex-end"
            overflow="hidden"
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
            {enableExamplePrompts && (
              <ChatInputIconFrame
                active={showPrompts}
                icon={<AiSparkleFilledIcon />}
                tooltip={`${showPrompts ? 'Hide' : 'Show'} example prompts`}
                onClick={() => setShowPrompts?.(!showPrompts)}
              />
            )}
            {!isEmpty(serverNames) && (
              <ChatInputIconFrame
                icon={<ServersIcon />}
                tooltip={`${mcpPanelOpen ? 'Collapse' : 'Expand'} MCP servers`}
                onClick={() => setMcpPanelOpen(!mcpPanelOpen)}
              />
            )}
            {!selectedAgent && currentThread && (
              <ChatInputCloudSelect currentThread={currentThread} />
            )}
            {!selectedAgent && !!currentThread?.session?.id && (
              <ChatInputClusterSelect currentThread={currentThread} />
            )}
          </Flex>
          <Button
            disabled={!newMessage.trim()}
            endIcon={<SendMessageIcon />}
            onClick={() => formRef.current?.requestSubmit()}
            secondary={!selectedAgent}
            small
            startIcon={selectedAgent ? <RobotIcon /> : undefined}
          >
            {selectedAgent ? 'Agent' : 'Chat'}
          </Button>
        </Flex>
      </EditableContentWrapperSC>
    </SendMessageFormSC>
  )
}

export function ChatInputSimple({
  onSubmit,
  allowSubmit = true,
  loading = false,
  disabled = false,
  bgColor = 'fill-zero-selected',
  options,
  ...props
}: {
  onSubmit: () => void
  allowSubmit?: boolean
  loading?: boolean
  bgColor?: SemanticColorKey
  options?: ReactNode
} & Omit<ComponentPropsWithRef<typeof EditableDiv>, 'onEnter'>) {
  const { spacing } = useTheme()

  const handleSubmit = () => allowSubmit && onSubmit()

  return (
    <EditableContentWrapperSC
      $agent={false}
      $bgColor={bgColor}
      css={{ position: 'relative', minHeight: 130 }}
    >
      <EditableDiv
        {...props}
        onEnter={handleSubmit}
        disabled={loading || disabled}
      />
      {options}
      <ChatSubmitButton
        loading={loading}
        loadingIndicator={<SpinnerAlt color="icon-xlight" />}
        disabled={!allowSubmit || loading || disabled}
        onClick={handleSubmit}
        css={{
          position: 'absolute',
          bottom: spacing.small,
          right: spacing.small,
        }}
      />
    </EditableContentWrapperSC>
  )
}

export function ChatSubmitButton({
  bgColor = 'fill-primary',
  ...props
}: { bgColor?: SemanticColorKey } & Omit<
  ComponentPropsWithRef<typeof ChatSubmitButtonSC>,
  'children' | '$bgColor'
>) {
  return (
    <ChatSubmitButtonSC
      $bgColor={bgColor}
      {...props}
    >
      <ArrowUpIcon />
    </ChatSubmitButtonSC>
  )
}

export function ChatOptionPill({
  isOpen = false,
  textType = 'caption',
  children,
  ...props
}: { textType?: SemanticPartialType } & ComponentPropsWithRef<typeof Chip>) {
  const { partials, colors } = useTheme()
  return (
    <Chip
      clickable
      fillLevel={2}
      size="large"
      css={{ borderRadius: 12 }}
      {...props}
    >
      <Flex
        align="center"
        gap="xsmall"
        css={{ ...partials.text[textType], color: colors['text-xlight'] }}
      >
        {children}
        <CaretDownIcon
          size={10}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease-in-out',
          }}
        />
      </Flex>
    </Chip>
  )
}

const SendMessageFormSC = styled.form(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  position: 'relative',
  padding: theme.spacing.medium,
}))

const EditableContentWrapperSC = styled.div<{
  $agent: boolean
  $bgColor: SemanticColorKey
}>(({ theme, $agent: agent, $bgColor }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.small,
  borderRadius: theme.borderRadiuses.large,
  backgroundColor: theme.colors[$bgColor],
  border: theme.borders.input,
  outline: '1px solid transparent',

  '&:has(div:focus)': {
    backgroundColor: theme.colors['fill-zero-selected'],
    transition: 'box-shadow 0.16s ease-in-out, border 0.16s ease-in-out',
    boxShadow: agent
      ? `0 0 0 3px rgba(116, 122, 246, 0.20), 0 0 0 7px rgba(116, 122, 246, 0.20)`
      : undefined,
    border: agent
      ? `${theme.borderWidths.default}px ${theme.borderStyles.default} ${theme.colors['border-primary']}`
      : theme.borders['outline-focused'],
  },
}))

const ChatSubmitButtonSC = styled(Button)<{ $bgColor: SemanticColorKey }>(
  ({ theme, $bgColor }) => ({
    ...theme.partials.reset.button,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    width: 28,
    minHeight: 0,
    borderRadius: 25,
    background: theme.colors[$bgColor],
    color: theme.colors['icon-light'],
  })
)

const ChipListSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xsmall,
  maxWidth: 256,
  minWidth: 0,
}))
