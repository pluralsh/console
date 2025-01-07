import { Code, Divider, Flex, IconFrame, Switch } from '@pluralsh/design-system'
import { ReactNode, useMemo, useState } from 'react'
import { Link, useMatch } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { stringify } from 'yaml'
import {
  AiInsight,
  ClusterInsightComponent as ClusterInsightComponentAPI,
  useClusterInsightComponentQuery,
} from '../../../generated/graphql.ts'
import {
  CLUSTER_ABS_PATH,
  CLUSTER_INSIGHTS_PATH,
} from '../../../routes/cdRoutesConsts.tsx'
import AIPinButton from '../../ai/AIPinButton.tsx'
import {
  ChatWithAIButton,
  insightMessage,
} from '../../ai/chatbot/ChatbotButton.tsx'
import { ClusterProviderIcon } from '../../utils/Provider.tsx'
import IconFrameRefreshButton from '../../utils/RefreshIconFrame.tsx'
import { BasicLink } from '../../utils/typography/BasicLink.tsx'
import {
  useClusterInsightsContext,
  useSetActionContent,
  useSetNavigationContent,
} from './ClusterInsights.tsx'
import { ComponentEntry } from './ClusterInsightsComponents.tsx'
import LoadingIndicator from 'components/utils/LoadingIndicator.tsx'
import { GqlError } from 'components/utils/Alert.tsx'
import { InsightDisplay } from '../../ai/InsightDisplay.tsx'

export default function ClusterInsightComponent(): ReactNode {
  const theme = useTheme()
  const { cluster, clusterLoading, refetch } = useClusterInsightsContext()
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
        <Flex
          flexDirection="column"
          gap="xxsmall"
        >
          <BasicLink
            as={Link}
            to=".."
            relative="path"
            css={{
              display: 'flex',
              gap: theme.spacing.xsmall,
              alignItems: 'center',
              ...theme.partials.text.overline,
              lineHeight: '12px',
              cursor: 'pointer',
            }}
          >
            <IconFrame
              type="floating"
              size="xsmall"
              icon={<ClusterProviderIcon cluster={cluster} />}
            />

            {cluster?.name}
          </BasicLink>
          <ComponentEntry
            component={component as Nullable<ClusterInsightComponentAPI>}
            icon={null}
          />
        </Flex>
      ),
      [cluster, component, theme]
    )
  )

  useSetActionContent(
    useMemo(
      () => (
        <>
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
          <AIPinButton insight={component?.insight as AiInsight} />
          <ChatWithAIButton
            floating
            insightId={component?.insight?.id}
            messages={[insightMessage(component?.insight)]}
          />
        </>
      ),
      [showRaw, clusterLoading, refetch, component?.insight]
    )
  )

  if (error) {
    return (
      <GqlError
        error={error}
        header="Error loading insight component"
      />
    )
  }

  if (loading) {
    return <LoadingIndicator />
  }

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
        <InsightDisplay text={component?.insight?.text} />
        {showRaw && (
          <Code language="yaml">{stringify(component?.resource?.raw)}</Code>
        )}
      </div>
    </>
  )
}
