import type { Breadcrumb } from '@pluralsh/design-system'
import {
  SubTab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import { useLogsEnabled } from 'components/contexts/DeploymentSettingsContext'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { LinkTabWrap } from 'components/utils/Tabs'
import { ReactNode, Suspense, useMemo, useRef, useState } from 'react'
import {
  Outlet,
  useMatch,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import {
  CD_ABS_PATH,
  CLUSTERS_REL_PATH,
  CLUSTER_ABS_PATH,
  CLUSTER_ADDONS_REL_PATH,
  CLUSTER_LOGS_PATH,
  CLUSTER_METADATA_PATH,
  CLUSTER_NODES_PATH,
  CLUSTER_PARAM_ID,
  CLUSTER_PODS_PATH,
  CLUSTER_PRS_REL_PATH,
  CLUSTER_SERVICES_PATH,
  CLUSTER_VCLUSTERS_REL_PATH,
} from 'routes/cdRoutesConsts'
import { useTheme } from 'styled-components'

import { ClusterFragment, useClusterQuery } from '../../../generated/graphql'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { CD_BASE_CRUMBS, PageHeaderContext } from '../ContinuousDeployment'
import ClusterSelector from '../utils/ClusterSelector'

import ClusterPermissions from './ClusterPermissions'
import ClusterSettings from './ClusterSettings'

const directory = [
  { path: CLUSTER_SERVICES_PATH, label: 'Services' },
  { path: CLUSTER_NODES_PATH, label: 'Nodes' },
  { path: CLUSTER_PODS_PATH, label: 'Pods' },
  { path: CLUSTER_METADATA_PATH, label: 'Metadata' },
  { path: CLUSTER_VCLUSTERS_REL_PATH, label: 'VClusters', vclusters: true },
  { path: CLUSTER_LOGS_PATH, label: 'Logs', logs: true },
  { path: CLUSTER_ADDONS_REL_PATH, label: 'Add-ons' },
  { path: CLUSTER_PRS_REL_PATH, label: 'PRs' },
] as const

const POLL_INTERVAL = 10 * 1000

export const getClusterBreadcrumbs = ({
  cluster,
  tab,
}: {
  cluster: {
    name?: Nullable<string>
    handle?: Nullable<string>
    id: Nullable<string>
  }
  tab?: string
}) => {
  const clustersPath = `${CD_ABS_PATH}/${CLUSTERS_REL_PATH}` as const
  const clusterPath = `${clustersPath}/${cluster.id}` as const
  const tabPath = `${clusterPath}/${tab || ''}` as const

  return [
    ...CD_BASE_CRUMBS,
    { label: 'clusters', url: clustersPath },
    ...(cluster.id
      ? [
          {
            label: cluster?.handle || cluster?.name || cluster.id,
            url: clusterPath,
          },
          ...(tab ? [{ label: tab, url: tabPath }] : []),
        ]
      : []),
  ]
}

function tabEnabled(tab, logsEnabled: boolean, isVCluster: boolean) {
  if (tab?.logs) {
    return logsEnabled
  }

  if (tab?.vclusters) {
    return !isVCluster
  }

  return true
}

export default function Cluster() {
  const theme = useTheme()
  const navigate = useNavigate()
  const tabStateRef = useRef<any>(null)
  const { clusterId } = useParams<{ clusterId: string }>()
  const tab = useMatch(`${CLUSTER_ABS_PATH}/:tab/*`)?.params?.tab || ''
  const [refetchServices, setRefetchServices] = useState(() => () => {})
  const logsEnabled = useLogsEnabled()

  const currentTab = directory.find(({ path }) => path === tab)

  const { data, refetch: refetchCluster } = useClusterQuery({
    variables: { id: clusterId || '' },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const cluster = data?.cluster

  const [headerContent, setHeaderContent] = useState<ReactNode>()

  const pageHeaderContext = useMemo(
    () => ({
      setHeaderContent,
    }),
    []
  )

  const crumbs: Breadcrumb[] = useMemo(
    () =>
      getClusterBreadcrumbs({
        cluster: cluster || { id: clusterId || '' },
        tab: currentTab?.path,
      }),
    [cluster, clusterId, currentTab?.path]
  )

  useSetBreadcrumbs(crumbs)

  if (!cluster) return <LoadingIndicator />

  return (
    <ResponsivePageFullWidth
      scrollable={
        tab !== 'services' &&
        tab !== 'pods' &&
        tab !== CLUSTER_PRS_REL_PATH &&
        tab !== CLUSTER_VCLUSTERS_REL_PATH &&
        tab !== 'addons' &&
        tab !== 'logs'
      }
      headingContent={
        <>
          <div css={{ width: 320, height: '100%' }}>
            <ClusterSelector
              clusterId={clusterId}
              allowDeselect={false}
              showUpgrades={tab === 'addons'}
              onClusterChange={(c) => {
                if (c?.id) {
                  navigate(`/cd/clusters/${c.id}/${tab}`)
                }
              }}
            />
          </div>
          <TabList
            scrollable
            stateRef={tabStateRef}
            stateProps={{
              orientation: 'horizontal',
              selectedKey: currentTab?.path,
            }}
          >
            {directory
              .filter((t) =>
                tabEnabled(t, logsEnabled, cluster?.virtual ?? false)
              )
              .map(({ label, path }) => (
                <LinkTabWrap
                  css={{ minWidth: 'fit-content' }}
                  subTab
                  key={path}
                  textValue={label}
                  to={`${CLUSTER_ABS_PATH}/${path}`.replace(
                    `:${CLUSTER_PARAM_ID}`,
                    clusterId ?? ''
                  )}
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
          <div
            css={{
              justifyContent: 'end',
              display: 'flex',
              flexGrow: 1,
              flexShrink: 0,
              gap: theme.spacing.small,
              marginLeft: theme.spacing.large,
            }}
          >
            {headerContent}
            <ClusterPermissions cluster={cluster} />
            {!cluster.self && <ClusterSettings cluster={cluster} />}
          </div>
        </>
      }
    >
      <TabPanel
        css={{ height: '100%' }}
        stateRef={tabStateRef}
      >
        <PageHeaderContext.Provider value={pageHeaderContext}>
          <Suspense fallback={<LoadingIndicator />}>
            <Outlet
              context={
                {
                  cluster,
                  refetch: refetchCluster,
                  refetchServices,
                  setRefetchServices,
                } satisfies ClusterContextType
              }
            />
          </Suspense>
        </PageHeaderContext.Provider>
      </TabPanel>
    </ResponsivePageFullWidth>
  )
}

type ClusterContextType = {
  cluster: ClusterFragment
  refetch: () => void
  refetchServices: () => void
  setRefetchServices: (refetch: () => () => void) => void
}

export function useClusterContext() {
  return useOutletContext<ClusterContextType>()
}
