import { Code, Divider, Flex, Switch } from '@pluralsh/design-system'
import {
  ChatWithAIButton,
  insightMessage,
} from 'components/ai/chatbot/ChatbotButton.tsx'
import { InsightDisplay } from 'components/ai/insights/InsightDisplay.tsx'
import { GqlError } from 'components/utils/Alert.tsx'
import IconFrameRefreshButton from 'components/utils/RefreshIconFrame.tsx'
import { useClusterInsightComponentQuery } from 'generated/graphql.ts'
import { useMemo, useState } from 'react'
import { useMatch } from 'react-router-dom'
import {
  CLUSTER_ABS_PATH,
  CLUSTER_INSIGHTS_PATH,
} from 'routes/cdRoutesConsts.tsx'
import { useTheme } from 'styled-components'
import { stringify } from 'yaml'
import {
  useClusterInsightsContext,
  useSetActionContent,
  useSetNavigationContent,
} from './ClusterInsights.tsx'
import { ClusterInsightComponentLabel } from './ClusterInsightsComponents.tsx'

export function ClusterInsightComponent() {
  const theme = useTheme()
  const { clusterLoading, refetch } = useClusterInsightsContext()
  const id =
    useMatch(`${CLUSTER_ABS_PATH}/${CLUSTER_INSIGHTS_PATH}/components/:id`)
      ?.params?.id || ''
  const { data, loading, error } = useClusterInsightComponentQuery({
    variables: { id },
  })

  const component = data?.clusterInsightComponent
  const [showRaw, setShowRaw] = useState(false)

  useSetNavigationContent(
    useMemo(
      () => (
        <ClusterInsightComponentLabel
          component={component}
          loading={!data && (loading || clusterLoading)}
          icon={null}
        />
      ),
      [component, data, loading, clusterLoading]
    )
  )

  useSetActionContent(
    useMemo(
      () => (
        <Flex gap="small">
          <Switch
            checked={showRaw}
            onChange={(checked) => setShowRaw(checked)}
          >
            Raw
          </Switch>
          <IconFrameRefreshButton
            loading={clusterLoading}
            refetch={refetch}
          />
          <ChatWithAIButton
            floating
            insightId={component?.insight?.id}
            messages={[insightMessage(component?.insight)]}
          />
        </Flex>
      ),
      [showRaw, clusterLoading, refetch, component?.insight]
    )
  )

  if (error)
    return (
      <GqlError
        error={error}
        header="Error loading insight component"
      />
    )

  return (
    <>
      <Divider backgroundColor={theme.colors.border} />
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.medium,
          height: '100%',
          minHeight: 0,
          width: '100%',

          ...(showRaw
            ? {
                '> div': {
                  width: '50%',
                },
              }
            : {}),
        }}
      >
        <InsightDisplay
          insight={component?.insight}
          kind={component?.kind}
          loading={loading}
        />
        {showRaw && (
          <Code language="yaml">{stringify(component?.resource?.raw)}</Code>
        )}
      </div>
    </>
  )
}
