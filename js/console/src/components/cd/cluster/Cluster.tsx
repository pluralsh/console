import {
  ICON_FRAME_ICON_SIZE,
  Breadcrumb,
  EmptyState,
  GearTrainIcon,
  ListBoxItem,
  PersonIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import {
  useLogsEnabled,
  useMetricsEnabled,
} from 'components/contexts/DeploymentSettingsContext'
import { PageColumnSC, PageRowSC } from 'components/layout/PageLayout'
import { PageToolbar } from 'components/layout/PageToolbar'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { isFunction } from 'lodash'
import {
  createContext,
  ReactNode,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import {
  Outlet,
  useMatch,
  useNavigate,
  useOutletContext,
} from 'react-router-dom'
import {
  CD_ABS_PATH,
  CLUSTER_ABS_PATH,
  CLUSTER_ADDONS_REL_PATH,
  CLUSTER_ALERTS_REL_PATH,
  CLUSTER_ALL_ADDONS_REL_PATH,
  CLUSTER_DETAILS_PATH,
  CLUSTER_INSIGHTS_PATH,
  CLUSTER_LOGS_PATH,
  CLUSTER_METRICS_PATH,
  CLUSTER_NETWORK_PATH,
  CLUSTER_PARAM_ID,
  CLUSTER_PRS_REL_PATH,
  CLUSTER_SERVICES_PATH,
  CLUSTER_VCLUSTERS_REL_PATH,
  CLUSTERS_REL_PATH,
} from 'routes/cdRoutesConsts'
import styled from 'styled-components'

import {
  ClusterFragment,
  ClusterMinimalFragment,
  ClusterQueryHookResult,
  MakeOptional,
  useClusterQuery,
} from '../../../generated/graphql'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { MoreMenu } from '../../utils/MoreMenu.tsx'
import {
  CD_BASE_CRUMBS,
  MoreMenuItem,
  PageHeaderContext,
} from '../ContinuousDeployment'
import ClusterSelector from '../utils/ClusterSelector'

import { DirectoryEntry } from 'components/layout/SideNavEntries.tsx'
import { InsightsTabLabel } from 'components/utils/AiInsights.tsx'
import { DirLabelWithChip } from '../services/service/ServiceDetails.tsx'
import { CLUSTER_DETAILS_TABS } from './ClusterDetails.tsx'
import { ClusterPermissionsModal } from './ClusterPermissions'
import { ClusterSettingsModal } from './ClusterSettings.tsx'

const getDirectory = ({
  cluster,
  logsEnabled,
  isVCluster,
  metricsEnabled,
  meshEnabled,
}: {
  cluster: Nullable<ClusterFragment>
  logsEnabled: boolean
  isVCluster: boolean
  metricsEnabled: boolean
  meshEnabled: boolean
}): DirectoryEntry[] => [
  { path: CLUSTER_SERVICES_PATH, label: 'Services' },
  { path: CLUSTER_DETAILS_PATH, label: 'Details' },
  { path: CLUSTER_ADDONS_REL_PATH, label: 'Add-ons' },
  { path: CLUSTER_METRICS_PATH, label: 'Metrics', enabled: metricsEnabled },
  { path: CLUSTER_LOGS_PATH, label: 'Logs', enabled: logsEnabled },
  {
    path: CLUSTER_NETWORK_PATH,
    label: 'Network',
    enabled: meshEnabled && metricsEnabled,
  },
  {
    path: CLUSTER_INSIGHTS_PATH,
    label: <InsightsTabLabel insight={cluster?.insight} />,
  },
  {
    path: CLUSTER_ALERTS_REL_PATH,
    label: (
      <DirLabelWithChip
        count={cluster?.alerts?.edges?.length}
        type="Alerts"
      />
    ),
  },
  {
    path: CLUSTER_VCLUSTERS_REL_PATH,
    label: 'VClusters',
    enabled: !isVCluster,
  },
]

const getSharedMenuItems = (cluster: ClusterFragment): Array<MoreMenuItem> => [
  {
    key: 'permissions',
    label: 'Permissions',
    icon: <PersonIcon size={ICON_FRAME_ICON_SIZE.small} />,
    enabled: true,
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: <GearTrainIcon size={ICON_FRAME_ICON_SIZE.small} />,
    enabled: !cluster.self,
  },
]

const POLL_INTERVAL = 10 * 1000

export const getClusterBreadcrumbs = ({
  cluster,
  tab: tabParam,
  detailsTab: detailsTabParam,
}: {
  cluster?: Nullable<MakeOptional<ClusterMinimalFragment, 'name'>>
  tab?: string
  detailsTab?: string
}) => {
  let [tab, detailsTab] = [tabParam, detailsTabParam]
  if (Object.keys(CLUSTER_DETAILS_TABS).includes(tabParam ?? '')) {
    tab = 'details'
    detailsTab = tabParam
  }
  const clustersPath = `${CD_ABS_PATH}/${CLUSTERS_REL_PATH}` as const
  const clusterPath = `${clustersPath}/${cluster?.id}` as const
  const tabPath = `${clusterPath}/${tab || ''}` as const

  return [
    ...CD_BASE_CRUMBS,
    { label: 'clusters', url: clustersPath },
    ...(cluster?.id
      ? [
          {
            label: cluster?.handle || cluster?.name || cluster?.id,
            url: clusterPath,
          },
          ...(tab ? [{ label: tab, url: tabPath }] : []),
          ...(detailsTab
            ? [{ label: detailsTab, url: `${tabPath}/${detailsTab}` }]
            : []),
        ]
      : []),
  ]
}

export function Cluster() {
  const navigate = useNavigate()
  const { clusterId, tab, detailsTab } =
    useMatch(`${CLUSTER_ABS_PATH}/:tab?/:detailsTab?/*`)?.params ?? {}
  const [refetchServices, setRefetchServices] = useState(() => () => {})
  const metricsEnabled = useMetricsEnabled()
  const logsEnabled = useLogsEnabled()

  const {
    data,
    refetch: refetchCluster,
    loading: clusterLoading,
  } = useClusterQuery({
    variables: { id: clusterId || '' },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const cluster = data?.cluster
  const meshEnabled = !!cluster?.operationalLayout?.serviceMesh
  const directory = useMemo(
    () =>
      getDirectory({
        cluster,
        logsEnabled,
        isVCluster: cluster?.virtual ?? false,
        metricsEnabled,
        meshEnabled,
      }).filter((t) => t.enabled !== false),
    [cluster, logsEnabled, metricsEnabled, meshEnabled]
  )
  const tabs = useMemo(
    () =>
      directory.map(({ label, path }) => ({
        key: path,
        label,
        path: `${CLUSTER_ABS_PATH}/${path}`.replace(
          `:${CLUSTER_PARAM_ID}`,
          clusterId ?? ''
        ),
      })),
    [directory, clusterId]
  )

  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const [sidebarSlot, setSidebarSlot] = useState<HTMLDivElement | null>(null)
  const [menuKey, setMenuKey] = useState<string>('')
  const sharedMenuItems = useMemo(
    () => (cluster ? getSharedMenuItems(cluster) : []),
    [cluster]
  )
  const [moreMenuItems, setMoreMenuItems] =
    useState<Array<MoreMenuItem>>(sharedMenuItems)
  const setMoreMenuItemsWrapper = useCallback(
    (items: Array<MoreMenuItem>) =>
      setMoreMenuItems([...sharedMenuItems, ...items]),
    [sharedMenuItems]
  )

  const pageHeaderContext = useMemo(
    () => ({
      setHeaderContent,
      setMoreMenuItems: setMoreMenuItemsWrapper,
      menuKey,
      setMenuKey,
    }),
    [menuKey, setMoreMenuItemsWrapper]
  )

  const crumbs: Breadcrumb[] = useMemo(
    () =>
      getClusterBreadcrumbs({
        cluster: cluster || { id: clusterId || '' },
        tab,
        detailsTab,
      }),
    [cluster, clusterId, detailsTab, tab]
  )

  useSetBreadcrumbs(crumbs)
  useEffect(() => setMoreMenuItems(sharedMenuItems), [sharedMenuItems, tab])

  if (!(cluster || clusterLoading))
    return <EmptyState message="Cluster not found." />

  return (
    <PageRowSC>
      <SidebarSlotSC ref={setSidebarSlot} />
      <PageColumnSC>
        <PageToolbar
          tabs={tabs}
          activeFn={(path) => path === tabs.find((t) => t.key === tab)?.path}
        >
          <div css={{ width: 240, flexShrink: 1, minWidth: 160 }}>
            <ClusterSelector
              clusterId={clusterId}
              allowDeselect={false}
              showUpgrades={tab === 'addons'}
              inputProps={{ small: true }}
              onClusterChange={(c) => {
                if (c?.id && c.id !== clusterId) {
                  navigate(
                    `/cd/clusters/${c.id}/${tab}/${tab === 'addons' ? CLUSTER_ALL_ADDONS_REL_PATH : tab === 'details' ? `${detailsTab}` : ''}`
                  )
                }
              }}
            />
          </div>
          {headerContent}
          <MoreMenu
            onSelectionChange={(newKey: string) => setMenuKey(newKey)}
            triggerProps={{
              iconFrameType: 'secondary',
              size: 'medium',
              iconSize: ICON_FRAME_ICON_SIZE.small,
            }}
          >
            {moreMenuItems.map((item) => {
              const enabled = isFunction(item.enabled)
                ? item.enabled()
                : item.enabled

              return enabled ? (
                <ListBoxItem
                  key={item.key}
                  leftContent={item.icon}
                  label={item.label}
                  textValue={item.label}
                />
              ) : undefined
            })}
          </MoreMenu>
        </PageToolbar>
        <ClusterPermissionsModal
          cluster={cluster}
          open={menuKey === 'permissions'}
          onClose={() => setMenuKey('')}
        />
        <ClusterSettingsModal
          cluster={cluster}
          open={menuKey === 'settings'}
          onClose={() => setMenuKey('')}
        />
        <ResponsivePageFullWidth
          scrollable={
            tab !== 'services' &&
            tab !== 'pods' &&
            tab !== CLUSTER_PRS_REL_PATH &&
            tab !== CLUSTER_VCLUSTERS_REL_PATH &&
            tab !== 'addons' &&
            tab !== 'logs'
          }
        >
          <PageHeaderContext value={pageHeaderContext}>
            <ClusterSidebarSlotContext value={sidebarSlot}>
              <Suspense fallback={<LoadingIndicator />}>
                <Outlet
                  context={
                    {
                      cluster,
                      clusterLoading,
                      refetch: refetchCluster,
                      refetchServices,
                      setRefetchServices,
                    } satisfies ClusterContextType
                  }
                />
              </Suspense>
            </ClusterSidebarSlotContext>
          </PageHeaderContext>
        </ResponsivePageFullWidth>
      </PageColumnSC>
    </PageRowSC>
  )
}

const SidebarSlotSC = styled.div({
  display: 'flex',
  flexShrink: 0,
  '&:empty': { display: 'none' },
})

const ClusterSidebarSlotContext = createContext<Nullable<HTMLElement>>(null)

// renders a tab's sidebar beside the cluster toolbar, from the header down
export function ClusterSidebarPortal({ children }: { children: ReactNode }) {
  const slot = useContext(ClusterSidebarSlotContext)

  return slot ? createPortal(children, slot) : null
}

export type ClusterContextType = {
  cluster: Nullable<ClusterFragment>
  clusterLoading: boolean
  refetch: ClusterQueryHookResult['refetch']
  refetchServices: () => void
  setRefetchServices: (refetch: () => void) => void
}

export function useClusterContext() {
  return useOutletContext<ClusterContextType>()
}
