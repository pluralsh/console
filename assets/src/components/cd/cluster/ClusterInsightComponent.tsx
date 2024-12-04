import { Code, Flex, IconFrame, Switch } from '@pluralsh/design-system'
import { ReactNode, useMemo, useState } from 'react'
import { Link, useMatch } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { stringify } from 'yaml'
import {
  AiInsight,
  ClusterInsightComponent as ClusterInsightComponentAPI,
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
import { InsightDisplay } from '../../stacks/insights/StackInsights.tsx'
import { ClusterProviderIcon } from '../../utils/Provider.tsx'
import IconFrameRefreshButton from '../../utils/RefreshIconFrame.tsx'
import { BasicLink } from '../../utils/typography/BasicLink.tsx'
import {
  useClusterInsightsContext,
  useSetActionContent,
  useSetNavigationContent,
} from './ClusterInsights.tsx'
import { ComponentEntry } from './ClusterInsightsComponents.tsx'

export default function ClusterInsightComponent(): ReactNode {
  const theme = useTheme()
  const { cluster, clusterLoading, refetch } = useClusterInsightsContext()
  const id =
    useMatch(`${CLUSTER_ABS_PATH}/${CLUSTER_INSIGHTS_PATH}/components/:id`)
      ?.params?.id || ''
  const component = cluster.insightComponents?.find(
    (cmp) => cmp?.id === id
  ) as ClusterInsightComponentAPI
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
            component={component}
            icon={null}
          />
        </Flex>
      ),
      [cluster, component, theme.partials.text.overline]
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

  return (
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
  )
}
