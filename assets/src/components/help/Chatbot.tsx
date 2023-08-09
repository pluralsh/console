import { PluralApi } from 'components/PluralApi'
import {
  ComponentProps,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react'
import styled from 'styled-components'
import {
  ChatMessageAttributes,
  useChatLazyQuery,
} from 'generated/graphql-plural'
import { Card, Input, usePrevious } from '@pluralsh/design-system'
import { useLogin } from 'components/contexts'

import { testMd } from './testMd'
import ChatbotMarkdown from './ChatbotMarkdown'

const INTRO =
  'What can we do to help you with Plural, using open source, or kubernetes?' as const

enum Role {
  user = 'user',
  assistant = 'assistant',
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

const ChatbotContentSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing.medium,
  flexDirection: 'column',
  rowGap: theme.spacing.small,
  maxWidth: 420,
  maxHeight: '100%',
  '.heading': {
    margin: 0,
    ...theme.partials.text.overline,
  },
  '.history': {
    display: 'flex',
    flexDirection: 'column',
    rowGap: theme.spacing.medium,
    flexGrow: 1,
    overflowY: 'auto',
  },
}))

function ChatbotContent({ ...props }: ComponentProps<typeof ChatbotContentSC>) {
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
    <ChatbotContentSC
      fillLevel={2}
      {...props}
    >
      <div className="history">
        {testMd.map((msg) => {
          const role = Role.assistant
          const name = 'Plural AI'

          return (
            <ChatMessage
              content={msg}
              role={role}
              name={name}
            />
          )
        })}
        {/* {history.map((msg) => {
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
        })} */}
      </div>
      <form onSubmit={sendMessage}>
        <Input
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
          disabled={disabled}
        />
      </form>
    </ChatbotContentSC>
  )
}

export default function Chatbot(props: ComponentProps<typeof ChatbotContent>) {
  return (
    <PluralApi>
      <ChatbotContent {...props} />
    </PluralApi>
  )
}
