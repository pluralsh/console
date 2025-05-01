import { Button, EmptyState, Flex, ReturnIcon } from '@pluralsh/design-system'
import { useAiInsightQuery } from 'generated/graphql'
import { useNavigate, useParams } from 'react-router-dom'
import { fromNow } from 'utils/datetime'

import { AIPinButton } from 'components/ai/AIPinButton'
import { AISuggestFix } from 'components/ai/chatbot/AISuggestFix'
import {
  ChatWithAIButton,
  insightMessage,
} from 'components/ai/chatbot/ChatbotButton'
import { InsightDisplay } from 'components/ai/insights/InsightDisplay'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import IconFrameRefreshButton from 'components/utils/RefreshIconFrame'
import { StackedText } from 'components/utils/table/StackedText'
import {
  getClusterDetailsPath,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import styled from 'styled-components'
import { ComponentPropsWithoutRef } from 'react'
import { getFlowDetailsPath } from 'routes/flowRoutesConsts'

export function AlertInsight({
  type,
}: {
  type: 'cluster' | 'service' | 'flow'
}) {
  const navigate = useNavigate()
  const { clusterId, serviceId, flowId, insightId } = useParams()

  const { data, loading, error, refetch } = useAiInsightQuery({
    variables: { id: insightId ?? '' },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const insight = data?.aiInsight
  const alert = insight?.alert

  if (!data && loading) return <LoadingIndicator />
  if (error) return <GqlError error={error} />
  if (!insight) return <EmptyState message="Insight not found" />

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
    >
      <Flex
        gap="small"
        justify="space-between"
        alignItems="center"
      >
        <Button
          onClick={() =>
            navigate(
              type === 'cluster'
                ? `${getClusterDetailsPath({ clusterId })}/alerts`
                : type === 'service'
                  ? `${getServiceDetailsPath({ clusterId, serviceId })}/alerts`
                  : `${getFlowDetailsPath({ flowId })}/alerts`
            )
          }
          floating
          startIcon={<ReturnIcon />}
        >
          Back to alerts
        </Button>
        {alert && (
          <StackedText
            truncate
            css={{ maxWidth: '50%' }}
            first={alert.title}
            firstPartialType="body1Bold"
            firstColor="text"
            second={alert.message}
          />
        )}
      </Flex>
      <Flex
        align="center"
        justify="space-between"
      >
        <StackedText
          first="Insight"
          firstPartialType="body1Bold"
          firstColor="text"
          second={
            insight?.updatedAt && `Last updated ${fromNow(insight.updatedAt)}`
          }
        />
        <Flex gap="small">
          <IconFrameRefreshButton
            loading={loading}
            refetch={refetch}
          />
          <AIPinButton insight={insight} />
          <ChatWithAIButton
            floating
            insightId={insight.id}
            messages={[insightMessage(insight)]}
          />
          <AISuggestFix insight={insight} />
        </Flex>
      </Flex>
      <InsightDisplay
        insight={insight}
        kind="alert"
      />
    </Flex>
  )
}

export function FullPageAlertInsight(
  props: ComponentPropsWithoutRef<typeof AlertInsight>
) {
  return (
    <FullPageAlertInsightSC>
      <AlertInsight {...props} />
    </FullPageAlertInsightSC>
  )
}

const FullPageAlertInsightSC = styled.div(({ theme }) => ({
  height: '100%',
  padding: theme.spacing.large,
}))
