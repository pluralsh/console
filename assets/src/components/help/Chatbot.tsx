import { PluralApi } from 'components/PluralApi'
import {
  ComponentProps,
  KeyboardEvent,
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
import { Card, FillLevelProvider, usePrevious } from '@pluralsh/design-system'
import { useLogin } from 'components/contexts'
import { usePlatform } from 'components/hooks/usePlatform'
import { submitForm } from 'components/utils/submitForm'

import { textAreaInsert } from 'components/utils/textAreaInsert'

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

function ChatbotFrame({ ...props }: ComponentProps<typeof ChatbotFrameSC>) {
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
          <ChatbotTextArea
            rows={2}
            value={message}
            onChange={(e) => {
              console.log('text changed', e.currentTarget.value)
              setMessage(e.currentTarget.value)
            }}
            disabled={disabled}
          />
        </ChatbotForm>
      </FillLevelProvider>
    </ChatbotFrameSC>
  )
}

const ChatbotForm = styled.form(({ theme }) => ({
  backgroundColor: theme.colors['fill-two'],
  padding: theme.spacing.medium,
  borderTop: theme.borders['fill-two'],
}))

const ChatbotInputSC = styled.div(({ theme }) => ({
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

function ChatbotTextArea({ className, ...props }: ComponentProps<'textarea'>) {
  const { isMac, ...ps } = usePlatform()

  console.log('platform', isMac, ps)
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const modKeyPressed = isMac ? e.metaKey : e.ctrlKey

        if (modKeyPressed) {
          textAreaInsert(e.currentTarget, '\n')
          // // Add newline
          // const tArea = e.currentTarget
          // let curVal = e.currentTarget.value

          // if (typeof document.execCommand === 'function') {
          //   console.log('execCommand')
          //   document.execCommand('insertText', false, '\n')
          // } else {
          //   const startPos = tArea.selectionStart
          //   const endPos = tArea.selectionEnd

          //   curVal = `${tArea.value.substring(
          //     0,
          //     startPos
          //   )}${'\n'}${curVal.substring(endPos, curVal.length)}`

          //   tArea.value = curVal
          //   tArea.selectionStart = startPos + 1
          //   tArea.selectionEnd = tArea.selectionStart
          // }

          // e.currentTarget.dispatchEvent(new Event('change', { bubbles: true }))
        } else {
          // Simulate form submit
          submitForm(e.currentTarget?.form)
        }
      }
    },
    [isMac]
  )

  return (
    <ChatbotInputSC className={className}>
      <textarea
        {...props}
        onKeyDown={onKeyDown}
      />
    </ChatbotInputSC>
  )
}

export default function Chatbot(props: ComponentProps<typeof ChatbotFrame>) {
  return (
    <PluralApi>
      <ChatbotFrame {...props} />
    </PluralApi>
  )
}
