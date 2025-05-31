import { mergeDeep } from '@apollo/client/utilities'
import { EmptyState, Flex, SubTab, TabList } from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cluster/constants.ts'
import { GqlError } from 'components/utils/Alert.tsx'
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  Suspense,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Outlet, useMatch, useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'
import {
  AiInsight,
  ClusterFragment,
  ClusterInsightFragment,
  useClusterInsightQuery,
} from '../../../generated/graphql.ts'
import {
  CLUSTER_ABS_PATH,
  CLUSTER_INSIGHTS_COMPONENTS_PATH,
  CLUSTER_INSIGHTS_PATH,
  CLUSTER_INSIGHTS_SUMMARY_PATH,
} from '../../../routes/cdRoutesConsts.tsx'
import { AIPinButton } from '../../ai/AIPinButton.tsx'
import {
  ChatWithAIButton,
  insightMessage,
} from '../../ai/chatbot/ChatbotButton.tsx'
import { InsightDisplay } from '../../ai/insights/InsightDisplay.tsx'
import LoadingIndicator from '../../utils/LoadingIndicator.tsx'
import IconFrameRefreshButton from '../../utils/RefreshIconFrame.tsx'
import { LinkTabWrap } from '../../utils/Tabs.tsx'
import { useClusterContext } from './Cluster.tsx'

const DIRECTORY: Array<DirectoryEntry> = [
  { path: CLUSTER_INSIGHTS_SUMMARY_PATH, label: 'Insight summary' },
  { path: CLUSTER_INSIGHTS_COMPONENTS_PATH, label: 'Component insights' },
]

interface DirectoryEntry {
  path: string
  label?: string
}

export default function ClusterInsights(): ReactNode {
  const theme = useTheme()
  const { cluster, clusterLoading } = useClusterContext()
  const tabStateRef = useRef<any>(null)
  const { tab } =
    useMatch(`${CLUSTER_ABS_PATH}/${CLUSTER_INSIGHTS_PATH}/:tab?/*`)?.params ??
    {}
  const currentTab = DIRECTORY.find(({ path }) => path === tab)

  const {
    data,
    loading: insightLoading,
    error,
    refetch,
  } = useClusterInsightQuery({
    variables: { id: cluster?.id ?? '' },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const [navigationContent, setNavigationContent] = useState<ReactNode>()
  const [actionContent, setActionContent] = useState<ReactNode>()
  const ctx: ClusterInsightsContextType = useMemo(
    () => ({
      cluster: mergeDeep(cluster, data?.cluster),
      clusterLoading: clusterLoading || insightLoading,
      refetch,
      setNavigationContent,
      setActionContent,
    }),
    [cluster, data?.cluster, clusterLoading, insightLoading, refetch]
  )

  if (error) return <GqlError error={error} />
  if (!data)
    return insightLoading ? (
      <LoadingIndicator />
    ) : (
      <EmptyState message="Cluster insights not found." />
    )
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
        <Flex
          align="center"
          gap="small"
        >
          {navigationContent ? (
            navigationContent
          ) : (
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
          )}
        </Flex>
        <Flex
          align="center"
          gap="small"
        >
          {actionContent}
        </Flex>
      </Flex>
      <Suspense fallback={<LoadingIndicator />}>
        <Outlet context={ctx} />
      </Suspense>
    </Flex>
  )
}

export function ClusterInsightsSummary(): ReactNode {
  const { cluster, refetch, clusterLoading } = useClusterContext()

  useSetActionContent(
    useMemo(
      () => (
        <>
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
        </>
      ),
      [cluster?.insight, clusterLoading, refetch]
    )
  )

  return (
    <InsightDisplay
      insight={cluster.insight}
      kind="cluster"
    />
  )
}

type ClusterInsightsContextType = {
  cluster: ClusterFragment & Nullable<ClusterInsightFragment>
  clusterLoading: boolean
  refetch: () => void
  setNavigationContent: Dispatch<SetStateAction<Nullable<ReactNode>>>
  setActionContent: Dispatch<SetStateAction<Nullable<ReactNode>>>
}

export function useClusterInsightsContext() {
  return useOutletContext<ClusterInsightsContextType>()
}

export function useSetNavigationContent(node?: ReactNode) {
  const ctx = useClusterInsightsContext()

  if (!ctx) {
    throw new Error(
      'useSetDirectory() must be used within a ClusterInsightsContext'
    )
  }

  const { setNavigationContent } = ctx

  useLayoutEffect(() => {
    setNavigationContent?.(node)

    return () => {
      setNavigationContent?.(null)
    }
  }, [node, setNavigationContent])
}

export function useSetActionContent(node?: ReactNode) {
  const ctx = useClusterInsightsContext()

  if (!ctx) {
    throw new Error(
      'useSetDirectory() must be used within a ClusterInsightsContext'
    )
  }

  const { setActionContent } = ctx

  useLayoutEffect(() => {
    setActionContent?.(node)

    return () => {
      setActionContent?.(null)
    }
  }, [node, setActionContent])
}
