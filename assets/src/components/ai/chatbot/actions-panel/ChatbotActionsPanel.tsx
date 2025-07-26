import { SimpleFlyover } from 'components/utils/SimpleFlyover'
import { Body2BoldP } from 'components/utils/typography/Text'
import { ChatThreadFragment, ChatType } from 'generated/graphql'
import styled from 'styled-components'
import { CHATBOT_HEADER_HEIGHT } from '../Chatbot'
import { mapExistingNodes } from 'utils/graphql'
import { Flex } from '@pluralsh/design-system'

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
      <Flex
        direction="column"
        overflow="hidden auto"
      >
        {messages.map((message) =>
          message.type !== ChatType.Text ? (
            <ActionItemSC key={message.id}>{message.content}</ActionItemSC>
          ) : null
        )}
      </Flex>
    </SimpleFlyover>
  )
}

const ActionItemSC = styled.div(({ theme }) => ({
  padding: theme.spacing.medium,
  borderBottom: theme.borders.default,
}))

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: theme.borders.default,
  padding: `0 ${theme.spacing.medium}px`,
  minHeight: CHATBOT_HEADER_HEIGHT,
}))
