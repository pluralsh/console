import {
  Card,
  CaretDownIcon,
  ChatIcon,
  CloseIcon,
  FillLevelProvider,
  IconFrame,
  ProgressBar,
  scrollIntoContainerView,
  usePrevious,
} from '@pluralsh/design-system'
import { useLogin } from 'components/contexts'
import { usePlatform } from 'components/hooks/usePlatform'
import { PluralApi } from 'components/PluralApi'
import { submitForm } from 'components/utils/submitForm'
import {
  ChatMessageAttributes,
  useChatLazyQuery,
} from 'generated/graphql-plural'
import {
  ComponentProps,
  ComponentPropsWithRef,
  KeyboardEvent,
  ReactNode,
  Ref,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
} from 'react'
import styled, { useTheme } from 'styled-components'

import { textAreaInsert } from 'components/utils/textAreaInsert'

// import { testMd } from './testMd'

import classNames from 'classnames'

import usePersistedSessionState from 'components/hooks/usePersistedSessionState'

import { BaseCardProps } from '@pluralsh/design-system/dist/components/Card'
import ChatbotMarkdown from './ChatbotMarkdown'

const INTRO =
  'What can we do to help you with Plural, using open source, or kubernetes?' as const

enum Role {
  user = 'user',
  assistant = 'assistant',
}

const ChatbotHeaderSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-two'],
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  h5: {
    ...theme.partials.text.body2Bold,
    margin: 0,
    flexGrow: 1,
  },
  '.icon': {
    display: 'flex',
    alignItems: 'center',
    width: theme.spacing.large,
    height: theme.spacing.large,
  },
}))

function ChatbotHeader({
  onClose,
  onMin,
}: {
  onClose: () => void
  onMin: () => void
}) {
  const theme = useTheme()

  return (
    <ChatbotHeaderSC>
      <div className="icon">
        <ChatIcon color={theme.colors['icon-primary']} />
      </div>
      <h5>Ask Plural AI</h5>
      <IconFrame
        clickable
        size="small"
        icon={<CloseIcon />}
        onClick={onClose}
      />
      <IconFrame
        clickable
        size="small"
        icon={<CaretDownIcon />}
        onClick={onMin}
      />
    </ChatbotHeaderSC>
  )
}

const ChatMessageSC = styled.li(({ theme }) => ({
  ...theme.partials.reset.li,
  '&, .name, p': {
    ...theme.partials.text.code,
    fontWeight: (theme.partials.text as any).fontWeight || 'normal',
    margin: 0,
  },
  '.name-user': {
    color: theme.colors['code-block-mid-blue'] || 'green',
  },
  '.name-assistant': {
    color: theme.colors['code-block-purple'] || 'green',
  },
}))

const ChatMessage = forwardRef(
  (
    {
      content,
      name,
      role,
      ...props
    }: ChatMessageAttributes & ComponentProps<typeof ChatMessageSC>,
    ref: Ref<HTMLLIElement>
  ) => {
    let finalContent: ReactNode

    if (role === Role.assistant) {
      finalContent = <ChatbotMarkdown text={content} />
    } else {
      finalContent = content.split('\n\n').map((str, i) => (
        <p key={i}>
          {str.split('\n').map((line, i, arr) => (
            <>
              {line}
              {i !== arr.length - 1 ? <br /> : null}
            </>
          ))}
        </p>
      ))
    }

    return (
      <ChatMessageSC
        ref={ref}
        {...props}
      >
        {name && (
          <h6 className="name">
            {`> `}
            <span className={`name-${role}`}>{name}</span>
          </h6>
        )}
        {finalContent}
      </ChatMessageSC>
    )
  }
)

const ChatbotLoadingBarSC = styled(ProgressBar)(({ theme }) => ({
  '&&': {
    position: 'absolute',
    top: -theme.borderWidths.default,
    left: 0,
    right: 0,
    borderRadius: 0,
    height: theme.borderWidths.default,
    background: 'none',
    transition: '0.2s opacity ease',
    opacity: 0,
    '&.show': {
      opacity: 1,
    },
  },
}))

const ChatbotHistorySC = styled.div(({ theme }) => ({
  position: 'relative',
  overflowY: 'auto',
  '.content': {
    ...theme.partials.reset.list,
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing.medium,
    rowGap: theme.spacing.medium,
    flexGrow: 1,
  },
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
  maxWidth: 420,
  maxHeight: '100%',
  boxShadow: theme.boxShadows.modal,
  '.heading': {
    margin: 0,
    ...theme.partials.text.overline,
  },
}))

type ChatbotFrameProps = ComponentPropsWithRef<'div'> &
  BaseCardProps & { onClose: () => void; onMin: () => void }

function ChatbotFrame({ onClose, onMin, ...props }: ChatbotFrameProps) {
  const [lazyQ, { called, loading, data }] = useChatLazyQuery()
  const hasMounted = useRef(false)
  const wasLoading = usePrevious(loading)
  const historyScrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const msgIdPrefix = useId()
  const lastUserMsgRef = useRef<HTMLLIElement>(null)
  const lastAsstMsgRef = useRef<HTMLLIElement>(null)

  const [message, setMessage] = usePersistedSessionState<string>(
    'aiChatMessage',
    ''
  )
  const [history, setHistory] = usePersistedSessionState<
    (ChatMessageAttributes & { timestamp: number })[]
  >('aiChatHistory', [
    {
      content: INTRO,
      role: Role.assistant,
      timestamp: Date.now(),
    },
  ])
  const lastHistoryLength = usePrevious(history.length)

  const { name: userName } = useLogin()?.me || {}
  const chatResponse = data?.chat

  useEffect(() => {
    if (!loading && wasLoading && chatResponse) {
      // And maybe double-check content doesn't match latest history content
      const { content, role } = chatResponse || {}

      setHistory([...history, { content, role, timestamp: Date.now() }])
    }
  }, [chatResponse, history, loading, setHistory, wasLoading])

  const lastUserMsgIdx = history.findLastIndex((msg) => msg.role === Role.user)
  const lastAsstMsgIdx = history.findLastIndex(
    (msg) => msg.role === Role.assistant
  )

  // Scroll to bottom on initial mount
  useLayoutEffect(() => {
    historyScrollRef.current?.scrollTo({ top: 9999999999999 })
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!hasMounted.current) {
      // Prevent smooth scrolling on first render
      // Instant scroll to bottom handled above
      hasMounted.current = true

      return
    }
    if (history.length === lastHistoryLength) {
      return
    }
    const scrollOpts: Parameters<typeof scrollIntoContainerView>[2] = {
      behavior: 'smooth',
      block: 'end',
      blockOffset: 16,
      preventIfVisible: false,
    }

    let scrollToElt = lastUserMsgRef.current

    if (lastAsstMsgIdx > lastUserMsgIdx) {
      scrollOpts.block = 'start'
      scrollToElt = lastAsstMsgRef.current
    }
    if (scrollToElt && historyScrollRef.current) {
      scrollIntoContainerView(scrollToElt, historyScrollRef.current, scrollOpts)
    }
  }, [history, lastAsstMsgIdx, lastHistoryLength, lastUserMsgIdx])

  const disabled = called && loading

  const sendMessage = useCallback(
    (e) => {
      e.preventDefault()
      if (message && !disabled) {
        const nextHistory = [
          ...history,
          { content: message, role: Role.user, timestamp: Date.now() },
        ]

        setMessage('')
        setHistory(nextHistory)
        lazyQ({
          variables: {
            // Remove initial message since that will be added automatically
            // on the server-side
            // Only include properties expected by the API
            history: nextHistory.slice(1).map(({ content, role }) => ({
              content,
              role,
            })),
          },
        })
      }
    },
    [disabled, history, lazyQ, message, setHistory, setMessage]
  )

  return (
    <ChatbotFrameSC
      fillLevel={1}
      {...props}
    >
      <ChatbotHeader
        onClose={onClose}
        onMin={onMin}
      />
      <ChatbotHistorySC ref={historyScrollRef}>
        <ul className="content">
          {/* {testMd.map((msg) => {
            const role = Role.assistant
            const name = 'Plural AI'

            return (
              <ChatMessage
                content={msg}
                role={role}
                name={name}
              />
            )
          })} */}
          {history.map((msg, i) => {
            const { role } = msg
            const name = msg.name
              ? msg.name
              : role === Role.assistant
                ? 'Plural AI'
                : userName
            const ref =
              i === lastAsstMsgIdx
                ? lastAsstMsgRef
                : i === lastUserMsgIdx
                  ? lastUserMsgRef
                  : undefined

            return (
              <ChatMessage
                key={msg.timestamp}
                id={`${msgIdPrefix}-${msg.timestamp}`}
                {...msg}
                name={name}
                ref={ref}
              />
            )
          })}
        </ul>
      </ChatbotHistorySC>
      <FillLevelProvider value={2}>
        <ChatbotFormSC onSubmit={sendMessage}>
          <div className="textareaWrap">
            <ChatbotTextArea
              ref={inputRef}
              rows={2}
              value={message}
              onChange={(e) => {
                setMessage(e.currentTarget.value)
              }}
              // disabled={disabled}
            />
          </div>
          <ChatbotLoadingBarSC
            // @ts-expect-error
            className={classNames({ show: loading })}
            complete={false}
          />
        </ChatbotFormSC>
      </FillLevelProvider>
    </ChatbotFrameSC>
  )
}

const ChatbotFormSC = styled.form(({ theme }) => ({
  position: 'relative',
  backgroundColor: theme.colors['fill-two'],
  padding: theme.spacing.medium,
  borderTop: theme.borders['fill-two'],
}))

const ChatbotTextAreaSC = styled.div(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  width: '100%',
  height: 'auto',
  // height: 40 + theme.spacing.small * 2,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders['outline-focused'],
  borderColor: theme.colors['fill-two-selected'],
  backgroundColor: theme.colors['fill-two-selected'],
  boxShadow: 'none',

  '&:focus, &:focus-visible, &:focus-within': {
    outline: 'none',
    boxShadow: 'none',
  },
  '&:focus-within': {
    border: theme.borders['outline-focused'],
    backgroundColor: theme.colors['fill-two-selected'],
    textarea: {},
  },
  textarea: {
    display: 'block',
    width: '100%',
    padding: theme.spacing.small - 1,
    overflowY: 'auto',
    backgroundColor: 'transparent',
    ...theme.partials.text.body2,
    color: theme.colors.text,
    resize: 'none',
    '&, &:focus, &:focus-within, &:focus-visible': {
      outline: 'none',
      border: 'none',
    },
  },
}))

const ChatbotTextArea = forwardRef(
  (
    {
      className,
      children,
      onKeyDown: onKeydownProp,
      ...props
    }: ComponentProps<'textarea'>,
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
            // Simulate form submit
            submitForm(e.currentTarget?.form)
          }
        }
      },
      [isMac, onKeydownProp]
    )

    return (
      <ChatbotTextAreaSC className={className}>
        <textarea
          ref={ref}
          {...props}
          onKeyDown={onKeyDown}
        />
        {children}
      </ChatbotTextAreaSC>
    )
  }
)

export default function Chatbot(props: ChatbotFrameProps) {
  return (
    <PluralApi>
      <ChatbotFrame {...props} />
    </PluralApi>
  )
}
