import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import moment from 'moment/moment'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { AiInsight } from '../../../generated/graphql.ts'
import AIPinButton from '../../ai/AIPinButton.tsx'
import { AISuggestFix } from '../../ai/chatbot/AISuggestFix.tsx'
import {
  ChatWithAIButton,
  insightMessage,
} from '../../ai/chatbot/ChatbotButton.tsx'
import IconFrameRefreshButton from '../../utils/RefreshIconFrame.tsx'
import { StackedText } from '../../utils/table/StackedText.tsx'
import { getBreadcrumbs, StackOutletContextT } from '../Stacks'
import { InsightDisplay } from '../../ai/InsightDisplay.tsx'

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
        justify="space-between"
        alignItems="center"
      >
        <StackedText
          first="Insight"
          firstPartialType="body1Bold"
          second={
            stack.insight?.updatedAt &&
            `Last updated ${moment(stack.insight?.updatedAt).fromNow()}`
          }
        />
        <Flex
          align="center"
          justify="flex-end"
          gap="small"
        >
          <IconFrameRefreshButton
            loading={loading}
            refetch={refetch}
          />
          <AIPinButton insight={stack.insight as AiInsight} />
          <ChatWithAIButton
            floating
            insightId={stack?.insight?.id}
            messages={[insightMessage(stack?.insight)]}
          />
          <AISuggestFix insight={stack?.insight} />
        </Flex>
      </Flex>
      <InsightDisplay text={stack.insight?.text} />
    </Flex>
  )
}
