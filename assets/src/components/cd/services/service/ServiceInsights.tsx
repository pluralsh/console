import { Flex } from '@pluralsh/design-system'
import { fromNow } from 'utils/datetime'

import { useTheme } from 'styled-components'
import { AiInsight } from '../../../../generated/graphql.ts'
import AIPinButton from '../../../ai/AIPinButton.tsx'
import { AISuggestFix } from '../../../ai/chatbot/AISuggestFix.tsx'
import {
  ChatWithAIButton,
  insightMessage,
} from '../../../ai/chatbot/ChatbotButton.tsx'
import { InsightDisplay } from '../../../ai/insights/InsightDisplay.tsx'
import IconFrameRefreshButton from '../../../utils/RefreshIconFrame.tsx'
import { StackedText } from '../../../utils/table/StackedText.tsx'
import { useServiceContext } from './ServiceDetails'

export function ServiceInsights() {
  const theme = useTheme()
  const { service, refetch, loading } = useServiceContext()

  return (
    <Flex
      direction="column"
      gap="medium"
      overflow="hidden"
      marginBottom={theme.spacing.large}
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
            service.insight?.updatedAt &&
            `Last updated ${fromNow(service.insight.updatedAt)}`
          }
        />
        <Flex
          align="center"
          gap="small"
        >
          <IconFrameRefreshButton
            loading={loading}
            refetch={refetch}
          />
          <AIPinButton insight={service?.insight as AiInsight} />
          <ChatWithAIButton
            floating
            insightId={service?.insight?.id}
            messages={[insightMessage(service?.insight)]}
          />
          <AISuggestFix insight={service?.insight} />
        </Flex>
      </Flex>
      <InsightDisplay
        insight={service.insight}
        kind="service"
      />
    </Flex>
  )
}
