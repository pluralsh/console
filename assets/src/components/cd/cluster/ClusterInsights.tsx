import { Flex, SubTab, TabList } from '@pluralsh/design-system'
import { ReactNode, Suspense, useRef } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { AiInsight } from '../../../generated/graphql.ts'
import {
  CLUSTER_ABS_PATH,
  CLUSTER_INSIGHTS_COMPONENTS_PATH,
  CLUSTER_INSIGHTS_PATH,
  CLUSTER_INSIGHTS_SUMMARY_PATH,
} from '../../../routes/cdRoutesConsts.tsx'
import AIPinButton from '../../ai/AIPinButton.tsx'
import { AISuggestFix } from '../../ai/chatbot/AISuggestFix.tsx'
import {
  ChatWithAIButton,
  insightMessage,
} from '../../ai/chatbot/ChatbotButton.tsx'
import { InsightDisplay } from '../../stacks/insights/StackInsights.tsx'
import LoadingIndicator from '../../utils/LoadingIndicator.tsx'
import IconFrameRefreshButton from '../../utils/RefreshIconFrame.tsx'
import { LinkTabWrap } from '../../utils/Tabs.tsx'
import { useClusterContext } from './Cluster.tsx'

const DIRECTORY = [
  { path: CLUSTER_INSIGHTS_SUMMARY_PATH, label: 'Insight summary' },
  { path: CLUSTER_INSIGHTS_COMPONENTS_PATH, label: 'Component insights' },
]

export default function ClusterInsights(): ReactNode {
  const theme = useTheme()
  const { cluster, refetch, clusterLoading } = useClusterContext()
  const tabStateRef = useRef<any>(null)
  const tab =
    useMatch(`${CLUSTER_ABS_PATH}/${CLUSTER_INSIGHTS_PATH}/:tab/*`)?.params
      ?.tab || ''
  const currentTab = DIRECTORY.find(({ path }) => path === tab)

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
        <TabList
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'horizontal',
            selectedKey: currentTab?.path,
          }}
        >
          {DIRECTORY.map(({ path, label }) => (
            <LinkTabWrap
              subTab
              key={path}
              textValue={label}
              to={path}
            >
              <SubTab
                key={path}
                textValue={label}
              >
                {label}
              </SubTab>
            </LinkTabWrap>
          ))}
        </TabList>
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
      <Suspense fallback={<LoadingIndicator />}>
        <Outlet
          context={{
            cluster,
            //     clusterLoading,
            //     refetch: refetchCluster,
            //     refetchServices,
            //     setRefetchServices,
          }}
        />
      </Suspense>
    </Flex>
  )
}

export function ClusterInsightsSummary(): ReactNode {
  const { cluster } = useClusterContext()

  return <InsightDisplay text={cluster.insight?.text} />
}
