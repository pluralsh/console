import { Button, EmptyState, Flex, ReturnIcon } from '@pluralsh/design-system'
import {
  AiInsightFragment,
  AlertFragment,
  useAiInsightQuery,
} from 'generated/graphql'
import { useNavigate, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { fromNow } from 'utils/datetime'

import AIPinButton from 'components/ai/AIPinButton'
import { AISuggestFix } from 'components/ai/chatbot/AISuggestFix'
import {
  ChatWithAIButton,
  insightMessage,
} from 'components/ai/chatbot/ChatbotButton'
import { InsightDisplay } from 'components/ai/InsightDisplay'
import { GqlError } from 'components/utils/Alert'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import IconFrameRefreshButton from 'components/utils/RefreshIconFrame'
import { StackedText } from 'components/utils/table/StackedText'
import { getClusterDetailsPath } from 'routes/cdRoutesConsts'
import { POLL_INTERVAL } from '../ContinuousDeployment'

export function ClusterAlertInsight() {
  const theme = useTheme()
  const { clusterId, insightId } = useParams()

  const { data, loading, error, refetch } = useAiInsightQuery({
    variables: { id: insightId ?? '' },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })
  console.log('data', data)
  const insight = data?.aiInsight
  const alert = insight?.alert

  if (!data && loading) return <LoadingIndicator />
  if (error) return <GqlError error={error} />
  if (!insight) return <EmptyState message="Insight not found" />

  return (
    <ScrollablePage scrollable={false}>
      <AlertInsight
        backPath={`${getClusterDetailsPath({ clusterId })}/alerts`}
        insight={insight}
        alert={alert}
        loading={loading}
        refetch={refetch}
      />
    </ScrollablePage>
  )
}

export function AlertInsight({
  backPath,
  backLabel = 'Back to alerts',
  alert,
  insight,
  loading,
  refetch,
}: {
  backPath: string
  backLabel?: string
  alert?: Nullable<Pick<AlertFragment, 'id' | 'title' | 'message'>>
  insight: AiInsightFragment
  loading: boolean
  refetch: () => void
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  if (!insight) return null

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
          onClick={() => navigate(backPath)}
          floating
          startIcon={<ReturnIcon />}
        >
          {backLabel}
        </Button>
        {alert && (
          <StackedText
            css={{ maxWidth: 550 }}
            truncate
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
        text={insight.text}
        kind="alert"
      />
    </Flex>
  )
}
