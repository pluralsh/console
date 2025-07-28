import { SimpleFlyover } from 'components/utils/SimpleFlyover'
import { Body2BoldP } from 'components/utils/typography/Text'
import { ChatThreadFragment, ChatType } from 'generated/graphql'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { CHATBOT_HEADER_HEIGHT } from '../Chatbot'

export function ChatbotActionsPanel({
  isOpen,
  currentThread,
  zIndex,
}: {
  isOpen: boolean
  currentThread: ChatThreadFragment
  zIndex?: number
}) {
  const messages = mapExistingNodes(currentThread.chats)
  return (
    <SimpleFlyover
      isOpen={isOpen}
      zIndex={zIndex}
    >
      <HeaderSC>
        <Body2BoldP>Actions panel</Body2BoldP>
      </HeaderSC>
      <div
        css={{
          overflow: 'auto',
        }}
      >
        {messages.map((message) =>
          message.type !== ChatType.Text ? (
            <ActionItemSC key={message.id}>{message.content}</ActionItemSC>
          ) : null
        )}
      </div>
    </SimpleFlyover>
  )
}

const ActionItemSC = styled.div(({ theme }) => ({
  padding: theme.spacing.medium,
  borderBottom: theme.borders.default,
  wordBreak: 'break-word',
  height: 'fit-content',
  maxHeight: 324,
  overflow: 'auto',
}))

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: theme.borders.default,
  padding: `0 ${theme.spacing.medium}px`,
  minHeight: CHATBOT_HEADER_HEIGHT,
}))
