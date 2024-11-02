import {
  Card,
  CheckIcon,
  CopyIcon,
  EmptyState,
  Flex,
  IconFrame,
  PluralLogoMark,
  ProgressBar,
  SendMessageIcon,
  Spinner,
  TrashCanIcon,
  usePrevious,
  WrapWithIf,
} from '@pluralsh/design-system'

import usePersistedSessionState from 'components/hooks/usePersistedSessionState'
import { usePlatform } from 'components/hooks/usePlatform'
import { submitForm } from 'components/utils/submitForm'
import {
  ComponentProps,
  forwardRef,
  KeyboardEvent,
  ReactNode,
  Ref,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import styled, { useTheme } from 'styled-components'
import { aiGradientBorderStyles } from '../explain/ExplainWithAIButton'

import { GqlError } from 'components/utils/Alert.tsx'
import LoadingIndicator from 'components/utils/LoadingIndicator.tsx'
import { textAreaInsert } from 'components/utils/textAreaInsert'
import {
  AiRole,
  ChatFragment,
  ChatThreadDetailsDocument,
  ChatThreadDetailsQuery,
  ChatThreadFragment,
  useChatMutation,
  useChatThreadDetailsQuery,
  useDeleteChatMutation,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import CopyToClipboard from 'react-copy-to-clipboard'
import { appendConnectionToEnd, updateCache } from 'utils/graphql.ts'
import ChatbotMarkdown from './ChatbotMarkdown.tsx'

export function ChatbotPanelThread({
  currentThread,
  fullscreen,
}: {
  currentThread: ChatThreadFragment
  fullscreen: boolean
}) {
  const theme = useTheme()
  const historyScrollRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lastMsgRef = useRef<HTMLLIElement>(null)
  const scrollToBottom = useCallback(() => {
    historyScrollRef.current?.scrollTo({ top: 9999999999999 })
  }, [historyScrollRef])

  const { data } = useChatThreadDetailsQuery({
    variables: { id: currentThread.id },
  })

  const [mutate, { loading: sendingMessage, error: messageError }] =
    useChatMutation({
      awaitRefetchQueries: true,
      refetchQueries: ['ChatThreadDetails'],
      optimisticResponse: ({ messages }) => ({
        chat: {
          __typename: 'Chat',
          id: crypto.randomUUID(),
          content: messages?.[0]?.content ?? '',
          role: AiRole.User,
          seq: 0,
          insertedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
      update: (cache, { data }) => {
        updateCache(cache, {
          query: ChatThreadDetailsDocument,
          variables: { id: currentThread.id },
          update: (prev: ChatThreadDetailsQuery) => ({
            chatThread: appendConnectionToEnd(
              prev.chatThread,
              data?.chat,
              'chats'
            ),
          }),
        })
      },
    })

  // focus input on initial mount
  useLayoutEffect(() => {
    inputRef.current?.focus()
  }, [])

  // scroll to the bottom when number of messages increases
  const length = data?.chatThread?.chats?.edges?.length ?? 0
  const prevLength = usePrevious(length) ?? 0
  useEffect(() => {
    if (length > prevLength) scrollToBottom()
  }, [length, prevLength, scrollToBottom])

  const sendMessage = useCallback(
    (newMessage: string) => {
      mutate({
        variables: {
          messages: [{ role: AiRole.User, content: newMessage }],
          threadId: currentThread.id,
        },
      })
    },
    [mutate, currentThread]
  )

  if (!data?.chatThread?.chats?.edges)
    return <LoadingIndicator css={{ background: theme.colors['fill-one'] }} />

  const messages = data.chatThread.chats.edges
    .map((edge) => edge?.node)
    .filter((msg): msg is ChatFragment => Boolean(msg))

  return (
    <>
      {messageError && <GqlError error={messageError} />}
      <ChatbotMessagesSC
        ref={historyScrollRef}
        $fullscreen={fullscreen}
      >
        {isEmpty(messages) && <EmptyState message="No messages yet." />}
        {messages.map((msg, i) => {
          const len = messages.length
          const ref = i === len - 1 ? lastMsgRef : undefined
          return (
            <ChatMessage
              key={msg.id}
              ref={ref}
              {...msg}
            />
          )
        })}
      </ChatbotMessagesSC>
      <ChatbotForm
        sendMessage={sendMessage}
        isSendingMessage={sendingMessage}
        ref={inputRef}
        fullscreen={fullscreen}
      />
    </>
  )
}

const ChatMessage = forwardRef(
  (
    {
      id,
      content,
      role,
      ...props
    }: {
      content: string
      role: AiRole
    } & ComponentProps<typeof ChatMessageSC>,
    ref: Ref<HTMLLIElement>
  ) => {
    const theme = useTheme()
    const [showActions, setShowActions] = useState(false)
    let finalContent: ReactNode

    if (role === AiRole.Assistant || role === AiRole.System) {
      finalContent = <ChatbotMarkdown text={content} />
    } else {
      finalContent = content.split('\n\n').map((str, i) => (
        <Card
          key={i}
          css={{ padding: theme.spacing.medium }}
          fillLevel={2}
        >
          {str.split('\n').map((line, i, arr) => (
            <div
              key={`${i}-${line}`}
              css={{ display: 'contents' }}
            >
              {line}
              {i !== arr.length - 1 ? <br /> : null}
            </div>
          ))}
        </Card>
      ))
    }

    return (
      <ChatMessageSC
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        ref={ref}
        {...props}
      >
        <ChatMessageActions
          id={id ?? ''}
          content={content}
          show={showActions}
        />
        <Flex
          gap="medium"
          justify={role === AiRole.User ? 'flex-end' : 'flex-start'}
        >
          {role !== AiRole.User && <PluralAssistantIcon />}
          <div>{finalContent}</div>
        </Flex>
      </ChatMessageSC>
    )
  }
)

function ChatMessageActions({
  id,
  content,
  show,
}: {
  id: string
  content: string
  show: boolean
}) {
  const [copied, setCopied] = useState(false)

  const showCopied = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const [deleteMessage, { loading: deleteLoading }] = useDeleteChatMutation({
    awaitRefetchQueries: true,
    refetchQueries: ['ChatThreadDetails'],
  })

  return (
    <ActionsWrapperSC $show={show}>
      <WrapWithIf
        condition={!copied}
        wrapper={
          <CopyToClipboard
            text={content}
            onCopy={showCopied}
          />
        }
      >
        <IconFrame
          clickable
          tooltip="Copy to clipboard"
          type="floating"
          size="medium"
          icon={copied ? <CheckIcon color="icon-success" /> : <CopyIcon />}
        />
      </WrapWithIf>
      <IconFrame
        clickable
        tooltip="Delete message"
        type="floating"
        size="medium"
        onClick={
          deleteLoading ? undefined : () => deleteMessage({ variables: { id } })
        }
        icon={
          deleteLoading ? <Spinner /> : <TrashCanIcon color="icon-danger" />
        }
      />
    </ActionsWrapperSC>
  )
}

const ChatbotForm = forwardRef(
  (
    {
      sendMessage,
      isSendingMessage,
      fullscreen,
      ...props
    }: {
      sendMessage: (newMessage: string) => void
      isSendingMessage: boolean
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
      <ChatbotFormSC
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
        <ChatbotLoadingBarSC
          $show={isSendingMessage}
          complete={false}
        />
      </ChatbotFormSC>
    )
  }
)

const ActionsWrapperSC = styled.div<{ $show: boolean }>(({ theme, $show }) => ({
  position: 'absolute',
  top: theme.spacing.small,
  right: theme.spacing.small,
  display: 'flex',
  gap: theme.spacing.xsmall,
  opacity: $show ? 1 : 0,
  transition: '0.2s opacity ease',
  pointerEvents: $show ? 'auto' : 'none',
}))

const ChatMessageSC = styled.li(({ theme }) => ({
  ...theme.partials.reset.li,
  position: 'relative',
  padding: theme.spacing.small,
}))

const ChatbotLoadingBarSC = styled(ProgressBar)<{ $show: boolean }>(
  ({ theme, $show }) => ({
    position: 'absolute',
    top: -theme.borderWidths.default,
    left: 0,
    right: 0,
    height: theme.borderWidths.default,
    transition: '0.2s opacity ease',
    opacity: $show ? 1 : 0,
  })
)

const ChatbotMessagesSC = styled.ul<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    ...($fullscreen && {
      borderRadius: theme.borderRadiuses.large,
      border: theme.borders.input,
    }),
    ...theme.partials.reset.list,
    backgroundColor: theme.colors['fill-one'],
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing.xsmall,
    flexGrow: 1,
  })
)

const ChatbotFormSC = styled.form<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    ...($fullscreen && {
      border: theme.borders.input,
    }),
    position: 'relative',
    borderRadius: theme.borderRadiuses.large,
    backgroundColor: $fullscreen
      ? theme.colors['fill-one']
      : theme.colors['fill-two'],
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

function PluralAssistantIcon() {
  return (
    <AssistantIconWrapperSC>
      <PluralLogoMark
        width={16}
        height={16}
      />
    </AssistantIconWrapperSC>
  )
}

const AssistantIconWrapperSC = styled.div(({ theme }) => ({
  ...aiGradientBorderStyles(theme, 'fill-two'),
  width: theme.spacing.xlarge,
  height: theme.spacing.xlarge,
  borderRadius: theme.borderRadiuses.large,
  padding: theme.spacing.xsmall,
  svg: {
    transform: 'translateY(-1px) translateX(-1px)',
  },
}))
