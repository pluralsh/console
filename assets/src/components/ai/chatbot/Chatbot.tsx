import {
  Card,
  ChatIcon,
  CheckIcon,
  CopyIcon,
  Flex,
  GearTrainIcon,
  IconFrame,
  ModalWrapper,
  ProgressBar,
  SendMessageIcon,
  WrapWithIf,
} from '@pluralsh/design-system'

import * as Dialog from '@radix-ui/react-dialog'
import {
  ComponentProps,
  ComponentPropsWithRef,
  FormEvent,
  forwardRef,
  KeyboardEvent,
  ReactNode,
  Ref,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { VisuallyHidden } from 'react-aria'
import styled, { useTheme } from 'styled-components'
import { useChatbotContext } from '../AIContext.tsx'
import { ChatbotIconButton } from './ChatbotButton.tsx'

import { useLogin } from 'components/contexts'
import usePersistedSessionState from 'components/hooks/usePersistedSessionState'
import { usePlatform } from 'components/hooks/usePlatform'
import { submitForm } from 'components/utils/submitForm'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { textAreaInsert } from 'components/utils/textAreaInsert'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import {
  AiRole,
  ChatThreadFragment,
  useChatMutation,
  useChatThreadMessagesQuery,
} from 'generated/graphql'
import CopyToClipboard from 'react-copy-to-clipboard'
import { useNavigate } from 'react-router-dom'
import { GLOBAL_SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'
import ChatbotMarkdown from './ChatbotMarkdown.tsx'
import { GqlError } from 'components/utils/Alert.tsx'

type ChatbotPanelInnerProps = ComponentPropsWithRef<typeof ChatbotFrameSC> & {
  onClose: () => void
  currentThread: Nullable<ChatThreadFragment>
}

export function Chatbot() {
  const theme = useTheme()
  const { open, setOpen, currentThread } = useChatbotContext()

  return (
    <div
      css={{
        // custom margin when explain with AI is visible
        marginRight: theme.spacing.xsmall,
        position: 'relative',
      }}
    >
      <ChatbotIconButton
        active={open}
        onClick={() => setOpen(true)}
      >
        <ChatIcon />
      </ChatbotIconButton>
      <ChatbotPanel
        open={open}
        onClose={() => setOpen(false)}
        currentThread={currentThread}
      />
    </div>
  )
}

export function ChatbotPanel({
  open,
  onClose,
  ...props
}: { open: boolean } & ChatbotPanelInnerProps) {
  const theme = useTheme()
  return (
    <ModalWrapper
      // onPointerDownOutside={(e) => e.preventDefault()}
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
  const historyScrollRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lastMsgRef = useRef<HTMLLIElement>(null)
  const [newMessage, setNewMessage] = usePersistedSessionState<string>(
    'currentAiChatMessage',
    ''
  )
  const scrollToBottom = useCallback(() => {
    historyScrollRef.current?.scrollTo({ top: 9999999999999 })
  }, [historyScrollRef])

  const { data, refetch } = useFetchPaginatedData(
    {
      queryHook: useChatThreadMessagesQuery,
      keyPath: ['chatThread', 'chats'],
    },
    {
      threadId: currentThread?.id ?? '',
    }
  )

  const [mutate, { loading: sendingMessage, error: messageError }] =
    useChatMutation({
      onCompleted: () => {
        setNewMessage('')
        refetch()
        scrollToBottom()
      },
    })

  // scroll to bottom and focus input on initial mount
  useLayoutEffect(() => {
    scrollToBottom()
    inputRef.current?.focus()
  }, [scrollToBottom])

  const sendMessage = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (!newMessage) {
        return
      }

      mutate({
        variables: {
          messages: [{ role: AiRole.User, content: newMessage }],
          threadId: currentThread?.id ?? '',
        },
      })
    },
    [mutate, newMessage, currentThread]
  )

  return (
    <ChatbotFrameSC
      fillLevel={1}
      {...props}
    >
      {messageError && <GqlError error={messageError} />}
      <ChatbotHeader onClose={onClose} />
      <ChatbotHistorySC ref={historyScrollRef}>
        {data?.chatThread?.chats?.edges?.map((edge, i) => {
          const len = data?.chatThread?.chats?.edges?.length || 1
          const ref = i == len - 1 ? lastMsgRef : undefined
          const msg = edge?.node
          if (!msg) return null
          return (
            <ChatMessage
              key={msg.id}
              ref={ref}
              {...msg}
            />
          )
        })}
      </ChatbotHistorySC>
      <ChatbotFormSC onSubmit={sendMessage}>
        <ChatbotTextArea
          ref={inputRef}
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.currentTarget.value)
          }}
        />
        <ChatbotLoadingBarSC
          $show={sendingMessage}
          complete={false}
        />
      </ChatbotFormSC>
    </ChatbotFrameSC>
  )
}

function ChatbotHeader({ onClose }: { onClose: () => void }) {
  const theme = useTheme()
  const navigate = useNavigate()

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

const ChatMessage = forwardRef(
  (
    {
      content,
      role,
      ...props
    }: {
      content: string
      role: AiRole
    } & ComponentProps<typeof ChatMessageSC>,
    ref: Ref<HTMLLIElement>
  ) => {
    let finalContent: ReactNode
    let { name } = useLogin()?.me || {}

    if (role === AiRole.Assistant || role === AiRole.System) {
      name = 'Plural AI'
      finalContent = <ChatbotMarkdown text={content} />
    } else {
      finalContent = content.split('\n\n').map((str, i) => (
        <span key={i}>
          {str.split('\n').map((line, i, arr) => (
            <div
              key={`${i}-${line}`}
              css={{ display: 'contents' }}
            >
              {line}
              {i !== arr.length - 1 ? <br /> : null}
            </div>
          ))}
        </span>
      ))
    }

    return (
      <ChatMessageSC
        ref={ref}
        {...props}
      >
        <Flex gap="xsmall">
          <h6 className="name">
            {`> `}
            <NameSC $role={role}>{name}</NameSC>
          </h6>
          <ChatMessageActions content={content} />
        </Flex>
        {finalContent}
      </ChatMessageSC>
    )
  }
)

function ChatMessageActions({ content }: { content: string }): ReactNode {
  const [copied, setCopied] = useState(false)

  const showCopied = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
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
          id="copy"
          clickable
          type="floating"
          size="medium"
          icon={copied ? <CheckIcon color="icon-success" /> : <CopyIcon />}
        />
      </WrapWithIf>
      {/* TODO: add if delete message will be supported by the API */}
      {/* <IconFrame */}
      {/*   id="delete" */}
      {/*   clickable */}
      {/*   type="floating" */}
      {/*   size="medium" */}
      {/*   icon={<TrashCanIcon color="icon-danger" />} */}
      {/* /> */}
    </>
  )
}

const ChatbotTextArea = forwardRef(
  (
    { onKeyDown: onKeydownProp, ...props }: ComponentProps<'textarea'>,
    ref: Ref<HTMLTextAreaElement>
  ) => {
    const { isMac } = usePlatform()

    const onKeyDown = useCallback(
      (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (onKeydownProp) {
          onKeydownProp(e)
        }
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
      [isMac, onKeydownProp]
    )

    return (
      <ChatbotTextAreaWrapperSC>
        <ChatbotTextAreaSC
          ref={ref}
          {...props}
          onKeyDown={onKeyDown}
        />
        <SendMessageButtonSC type="submit">
          <SendMessageIcon />
        </SendMessageButtonSC>
      </ChatbotTextAreaWrapperSC>
    )
  }
)

const ChatbotHeaderSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-two'],
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
}))

const ChatMessageSC = styled.li(({ theme }) => ({
  ...theme.partials.reset.li,
  padding: theme.spacing.small,

  '.name': {
    width: '100%',
    marginBottom: theme.spacing.medium,
  },

  '#copy, #delete': {
    display: 'none',
  },

  '& *': {
    ...theme.partials.text.code,
    fontWeight: (theme.partials.text as any).fontWeight || 'normal',
  },

  '&:hover': {
    background: theme.colors['fill-one-hover'],
    borderRadius: theme.borderRadiuses.large,

    '#copy, #delete': {
      display: 'inherit',
    },
  },
}))
const NameSC = styled.span<{ $role: AiRole }>(({ theme, $role }) => ({
  color:
    $role === AiRole.User
      ? theme.colors['code-block-mid-blue'] || 'green'
      : theme.colors['code-block-purple'] || 'green',
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

const ChatbotHistorySC = styled.ul(({ theme }) => ({
  ...theme.partials.reset.list,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing.medium,
  flexGrow: 1,
  '.progressBar': {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 0,
    height: 2,
    background: 'none',
    '.show': {
      opacity: 1,
    },
  },
}))

const ChatbotFrameSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: 560,
  boxShadow: theme.boxShadows.modal,
}))

const ChatbotFormSC = styled.form(({ theme }) => ({
  position: 'relative',
  backgroundColor: theme.colors['fill-two'],
  padding: theme.spacing.medium,
  borderTop: theme.borders['fill-two'],
}))

const ChatbotTextAreaWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,
  padding: theme.spacing.small,
  borderRadius: theme.borderRadiuses.large,
  backgroundColor: theme.colors['fill-three'],
  '&:has(textarea:focus)': {
    outline: theme.borders['outline-focused'],
  },
}))

const ChatbotTextAreaSC = styled.textarea(({ theme }) => ({
  ...theme.partials.text.body2,
  flex: 1,
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
