import {
  Breadcrumb,
  SubTab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Suspense, useMemo, useRef } from 'react'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import {
  Outlet,
  useMatch,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import { LinkTabWrap } from 'components/utils/Tabs'
import {
  CD_ABS_PATH,
  CLUSTERS_REL_PATH,
  CLUSTER_ABS_PATH,
  CLUSTER_METADATA_PATH,
  CLUSTER_NODES_PATH,
  CLUSTER_PODS_PATH,
  CLUSTER_SERVICES_PATH,
} from 'routes/cdRoutesConsts'
import { useTheme } from 'styled-components'

import { ClusterFragment, useClusterQuery } from '../../../generated/graphql'
import { CD_BASE_CRUMBS } from '../ContinuousDeployment'
import LoadingIndicator from '../../utils/LoadingIndicator'

import ClusterSelector from '../utils/ClusterSelector'

import ClusterPermissions from './ClusterPermissions'
import ClusterSettings from './ClusterSettings'

const directory = [
  { path: CLUSTER_SERVICES_PATH, label: 'Services' },
  { path: CLUSTER_NODES_PATH, label: 'Nodes' },
  { path: CLUSTER_PODS_PATH, label: 'Pods' },
  { path: CLUSTER_METADATA_PATH, label: 'Metadata' },
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

export default function Cluster() {
  const theme = useTheme()
  const navigate = useNavigate()
  const tabStateRef = useRef<any>(null)
  const { clusterId } = useParams<{ clusterId: string }>()
  const tab = useMatch(`${CLUSTER_ABS_PATH}/:tab`)?.params?.tab || ''

  const currentTab = directory.find(({ path }) => path === tab)

  const { data, refetch } = useClusterQuery({
    variables: { id: clusterId || '' },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const cluster = data?.cluster

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
      scrollable={tab !== 'services' && tab !== 'pods'}
      headingContent={
        <>
          <div css={{ width: 360 }}>
            <ClusterSelector
              clusterId={clusterId}
              allowDeselect={false}
              onClusterChange={(c) => {
                if (c?.id) {
                  navigate(`/cd/clusters/${c.id}/${tab}`)
                }
              }}
            />
          </div>
          <TabList
            gap="xxsmall"
            stateRef={tabStateRef}
            stateProps={{
              orientation: 'horizontal',
              selectedKey: currentTab?.path,
            }}
          >
            {directory.map(({ label, path }) => (
              <LinkTabWrap
                subTab
                key={path}
                textValue={label}
                to={`${CLUSTER_ABS_PATH}/${path}`.replace(
                  ':clusterId',
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
              gap: theme.spacing.small,
            }}
          >
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
        <Suspense fallback={<LoadingIndicator />}>
          <Outlet context={{ cluster, refetch } satisfies ClusterContextType} />
        </Suspense>
      </TabPanel>
    </ResponsivePageFullWidth>
  )
}

type ClusterContextType = {
  cluster: ClusterFragment
  refetch: () => void
}

export function useClusterContext() {
  return useOutletContext<ClusterContextType>()
}
