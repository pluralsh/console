import { SimpleFlyover } from 'components/utils/SimpleFlyover'
import { Body2BoldP } from 'components/utils/typography/Text'
import { ChatThreadFragment } from 'generated/graphql'
import styled from 'styled-components'
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
  return (
    <SimpleFlyover
      isOpen={isOpen}
      zIndex={zIndex}
    >
      <HeaderSC>
        <Body2BoldP>Actions panel</Body2BoldP>
      </HeaderSC>
    </SimpleFlyover>
  )
}

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: theme.borders.default,
  padding: `0 ${theme.spacing.medium}px`,
  height: CHATBOT_HEADER_HEIGHT,
}))
