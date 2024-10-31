import {
  Card,
  EmptyState,
  Flex,
  Markdown,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import { CaptionP } from 'components/utils/typography/Text'
import moment from 'moment/moment'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import styled from 'styled-components'
import { AISuggestFix } from '../../ai/chatbot/AISuggestFix.tsx'
import {
  ChatWithAIButton,
  insightMessage,
} from '../../ai/chatbot/ChatbotButton.tsx'
import IconFrameRefreshButton from '../../utils/RefreshIconFrame.tsx'
import { getBreadcrumbs, StackOutletContextT } from '../Stacks'

export function StackInsights() {
  const { stack, refetch, loading } = useOutletContext() as StackOutletContextT

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stack.id, stack.name), { label: 'insights' }],
      [stack]
    )
  )
  return (
    <Flex
      direction="column"
      gap="medium"
      overflow="hidden"
      height="100%"
    >
      <Flex
        align="center"
        justify="flex-end"
        gap="small"
      >
        <CaptionP
          css={{ width: 'max-content' }}
          $color="text-xlight"
        >
          {stack.insight?.updatedAt &&
            `Last updated ${moment(stack.insight?.updatedAt).fromNow()}`}
        </CaptionP>
        <IconFrameRefreshButton
          loading={loading}
          refetch={refetch}
        />
        <ChatWithAIButton
          floating
          insightId={stack?.insight?.id}
          messages={[insightMessage(stack?.insight)]}
        />
        <AISuggestFix insight={stack?.insight} />
      </Flex>
      <InsightDisplay text={stack.insight?.text} />
    </Flex>
  )
}

export const InsightDisplay = ({ text }: { text: Nullable<string> }) => {
  return (
    <InsightWrapperCardSC>
      {text ? (
        <Markdown text={text} />
      ) : (
        <EmptyState
          message="No insights available"
          description="Insights are generated by Plural AI when triggered by a failing state."
        />
      )}
    </InsightWrapperCardSC>
  )
}

const InsightWrapperCardSC = styled(Card)(({ theme }) => ({
  padding: theme.spacing.medium,
  overflow: 'auto',
}))
