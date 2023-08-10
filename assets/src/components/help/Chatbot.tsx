import { PluralApi } from 'components/PluralApi'
import {
  ComponentProps,
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react'
import styled, { useTheme } from 'styled-components'
import {
  ChatMessageAttributes,
  useChatLazyQuery,
} from 'generated/graphql-plural'
import {
  Card,
  CaretDownIcon,
  CloseIcon,
  FillLevelProvider,
  IconFrame,
  ProgressBar,
  usePrevious,
} from '@pluralsh/design-system'
import { useLogin } from 'components/contexts'
import { usePlatform } from 'components/hooks/usePlatform'
import { submitForm } from 'components/utils/submitForm'
import { Merge } from 'type-fest'

import { textAreaInsert } from 'components/utils/textAreaInsert'

// import { testMd } from './testMd'
import classNames from 'classnames'

import ChatbotMarkdown from './ChatbotMarkdown'
import ChatIcon from './ChatIcon'

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

const ChatMessageSC = styled.div(({ theme }) => {
  console.log()

  return {
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
  }
})

function ChatMessage({ content, name, role }: ChatMessageAttributes) {
  let finalContent: ReactNode

  if (role === Role.assistant) {
    finalContent = <ChatbotMarkdown text={content} />
  } else {
    finalContent = content.split('\n\n').map((str) => (
      <p>
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
    <ChatMessageSC>
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

const ChatbotFrameSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  maxWidth: 420,
  maxHeight: '100%',
  '.heading': {
    margin: 0,
    ...theme.partials.text.overline,
  },
}))

const ChatbotHistorySC = styled.div(({ theme }) => ({
  overflowY: 'auto',
  '.content': {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing.medium,
    rowGap: theme.spacing.medium,
    flexGrow: 1,
  },
}))

function ChatbotFrame({
  onClose,
  onMin,
  ...props
}: Merge<
  ComponentProps<typeof ChatbotFrameSC>,
  { onClose: () => void; onMin: () => void }
>) {
  const [lazyQ, { called, loading, data, error }] = useChatLazyQuery()
  const wasLoading = usePrevious(loading)

  const [message, setMessage] = useState<string>('')
  const [history, setHistory] = useState<ChatMessageAttributes[]>([
    {
      content: INTRO,
      role: Role.assistant,
    },
  ])
  const { name: userName } = useLogin()?.me || {}
  const chatResponse = data?.chat

  console.log({ data, error })
  console.log({ chatResponse, called, loading })

  useEffect(() => {
    if (!loading && wasLoading && chatResponse) {
      // And maybe double-check content doesn't match latest history content
      const { content, role } = chatResponse || {}

      setHistory([...history, { content, role }])
    }
  }, [chatResponse, history, loading, wasLoading])

  const disabled = called && loading

  const sendMessage = useCallback(
    (e) => {
      console.log('sendmessage', message)
      e.preventDefault()
      if (message && !disabled) {
        const nextHistory = [...history, { content: message, role: Role.user }]

        setMessage('')
        setHistory(nextHistory)
        console.log('query with history', nextHistory)
        lazyQ({
          variables: {
            history: nextHistory,
          },
        })
      }
    },
    [disabled, history, lazyQ, message]
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
      <ChatbotHistorySC>
        <div className="content">
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
          {history.map((msg) => {
            const { role } = msg
            const name = msg.name
              ? msg.name
              : role === Role.assistant
              ? 'Plural AI'
              : userName

            return (
              <ChatMessage
                {...msg}
                name={name}
              />
            )
          })}
        </div>
      </ChatbotHistorySC>
      <FillLevelProvider value={2}>
        <ChatbotForm onSubmit={sendMessage}>
          <div className="textareaWrap">
            <ChatbotTextArea
              rows={2}
              value={message}
              onChange={(e) => {
                console.log('text changed', e.currentTarget.value)
                setMessage(e.currentTarget.value)
              }}
              // disabled={disabled}
            >
              {loading && (
                <ProgressBar
                  // @ts-expect-error
                  className="progressBar"
                  mode="indeterminate"
                  complete={false}
                />
              )}
            </ChatbotTextArea>
          </div>
        </ChatbotForm>
      </FillLevelProvider>
    </ChatbotFrameSC>
  )
}

const ChatbotForm = styled.form(({ theme }) => ({
  backgroundColor: theme.colors['fill-two'],
  padding: theme.spacing.medium,
  borderTop: theme.borders['fill-two'],
  '.textareaWrap': {
    position: 'relative',
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

function ChatbotTextArea({
  className,
  children,
  ...props
}: ComponentProps<'textarea'>) {
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
          // Simulate form submit
          submitForm(e.currentTarget?.form)
        }
      }
    },
    [isMac]
  )

  return (
    <ChatbotTextAreaSC className={className}>
      <textarea
        {...props}
        onKeyDown={onKeyDown}
      />
      {children}
    </ChatbotTextAreaSC>
  )
}

export default function Chatbot(props: ComponentProps<typeof ChatbotFrame>) {
  return (
    <PluralApi>
      <ChatbotFrame {...props} />
    </PluralApi>
  )
}
