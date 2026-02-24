import { Button, EmptyState, Flex, ReturnIcon } from '@pluralsh/design-system'
import { useAiInsightQuery } from 'generated/graphql'
import { Link, useParams } from 'react-router-dom'
import { fromNow } from 'utils/datetime'

import { AISuggestFix } from 'components/ai/chatbot/AISuggestFix'
import {
  ChatWithAIButton,
  insightMessage,
} from 'components/ai/chatbot/ChatbotButton'
import { InsightDisplay } from 'components/ai/insights/InsightDisplay'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import IconFrameRefreshButton from 'components/utils/RefreshIconFrame'
import { StackedText } from 'components/utils/table/StackedText'
import { ComponentPropsWithoutRef } from 'react'
import {
  getClusterDetailsPath,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import { getFlowDetailsPath } from 'routes/flowRoutesConsts'
import styled from 'styled-components'

export function AlertInsight({
  type,
}: {
  type: 'cluster' | 'service' | 'flow'
}) {
  const { clusterId, serviceId, flowIdOrName, insightId } = useParams()

  const { data, loading, error, refetch } = useAiInsightQuery({
    variables: { id: insightId ?? '' },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const insight = data?.aiInsight
  const alert = insight?.alert

  const backButton = (
    <Button
      as={Link}
      to={
        type === 'cluster'
          ? `${getClusterDetailsPath({ clusterId })}/alerts`
          : type === 'service'
            ? `${getServiceDetailsPath({ clusterId, serviceId, flowIdOrName })}/alerts`
            : `${getFlowDetailsPath({ flowIdOrName })}/alerts`
      }
      floating
      startIcon={<ReturnIcon />}
    >
      Back to alerts
    </Button>
  )

  if (error && !error?.message?.includes('could not find resource'))
    return <GqlError error={error} />
  if (!(data || loading))
    return <EmptyState message="Insight not found">{backButton}</EmptyState>

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
        {backButton}
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
          <ChatWithAIButton
            floating
            insightId={insight?.id}
            messages={[insightMessage(insight)]}
          />
          <AISuggestFix insight={insight} />
        </Flex>
      </Flex>
      <InsightDisplay
        insight={insight}
        kind="alert"
        loading={loading}
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
