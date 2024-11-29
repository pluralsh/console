import { Flex } from '@pluralsh/design-system'
import moment from 'moment'
import { ReactNode } from 'react'
import { useTheme } from 'styled-components'
import { AiInsight } from '../../../generated/graphql.ts'
import AIPinButton from '../../ai/AIPinButton.tsx'
import { AISuggestFix } from '../../ai/chatbot/AISuggestFix.tsx'
import {
  ChatWithAIButton,
  insightMessage,
} from '../../ai/chatbot/ChatbotButton.tsx'
import { InsightDisplay } from '../../stacks/insights/StackInsights.tsx'
import IconFrameRefreshButton from '../../utils/RefreshIconFrame.tsx'
import { StackedText } from '../../utils/table/StackedText.tsx'
import { useClusterContext } from './Cluster.tsx'

export default function ClusterInsights(): ReactNode {
  const theme = useTheme()
  const { cluster, refetch, clusterLoading } = useClusterContext()

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
            cluster.insight?.updatedAt &&
            `Last updated ${moment(cluster.insight?.updatedAt).fromNow()}`
          }
        />
        <Flex
          align="center"
          gap="small"
        >
          <IconFrameRefreshButton
            loading={clusterLoading}
            refetch={refetch}
          />
          <AIPinButton insight={cluster?.insight as AiInsight} />
          <ChatWithAIButton
            floating
            insightId={cluster?.insight?.id}
            messages={[insightMessage(cluster?.insight)]}
          />
          <AISuggestFix insight={cluster?.insight} />
        </Flex>
      </Flex>
      <InsightDisplay text={cluster.insight?.text} />
    </Flex>
  )
}
