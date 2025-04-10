import {
  Breadcrumb,
  GearTrainIcon,
  IconFrame,
  ListBoxItem,
  MoreIcon,
  PersonIcon,
  SubTab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import { useLogsEnabled } from 'components/contexts/DeploymentSettingsContext'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { LinkTabWrap } from 'components/utils/Tabs'
import { isFunction } from 'lodash'
import {
  ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
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
  CLUSTER_NETWORK_PATH,
  CLUSTER_PARAM_ID,
  CLUSTER_PRS_REL_PATH,
  CLUSTER_SERVICES_PATH,
  CLUSTER_VCLUSTERS_REL_PATH,
  CLUSTERS_REL_PATH,
} from 'routes/cdRoutesConsts'
import { useTheme } from 'styled-components'

import {
  ClusterFragment,
  ClusterMinimalFragment,
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

import { InsightsTabLabel } from 'components/utils/AiInsights.tsx'
import { DirLabelWithChip } from '../services/service/ServiceDetails.tsx'
import { ClusterPermissionsModal } from './ClusterPermissions'
import { ClusterSettingsModal } from './ClusterSettings.tsx'
import { CLUSTER_DETAILS_TABS } from './ClusterDetails.tsx'

const getDirectory = ({ cluster }: { cluster: Nullable<ClusterFragment> }) =>
  [
    { path: CLUSTER_SERVICES_PATH, label: 'Services' },
    { path: CLUSTER_DETAILS_PATH, label: 'Details' },
    { path: CLUSTER_NETWORK_PATH, label: 'Network' },
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
    { path: CLUSTER_VCLUSTERS_REL_PATH, label: 'VClusters', vclusters: true },
    { path: CLUSTER_LOGS_PATH, label: 'Logs', logs: true },
    { path: CLUSTER_ADDONS_REL_PATH, label: 'Add-ons' },
    { path: CLUSTER_PRS_REL_PATH, label: 'PRs' },
  ] as const

const getSharedMenuItems = (cluster: ClusterFragment): Array<MoreMenuItem> => [
  {
    key: 'permissions',
    label: 'Permissions',
    icon: <PersonIcon />,
    enabled: true,
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: <GearTrainIcon />,
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
  if (CLUSTER_DETAILS_TABS.includes(tabParam ?? '')) {
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
  const { clusterId, tab, detailsTab } =
    useMatch(`${CLUSTER_ABS_PATH}/:tab?/:detailsTab?/*`)?.params ?? {}
  const [refetchServices, setRefetchServices] = useState(() => () => {})
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
  const directory = getDirectory({ cluster })
  const currentTab = directory.find(({ path }) => path === tab)

  const [headerContent, setHeaderContent] = useState<ReactNode>()
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
                  navigate(
                    `/cd/clusters/${c.id}/${tab}/${tab === 'addons' ? CLUSTER_ALL_ADDONS_REL_PATH : ''}`
                  )
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
                  to={`${CLUSTER_ABS_PATH}/${path}`.replace(
                    `:${CLUSTER_PARAM_ID}`,
                    clusterId ?? ''
                  )}
                >
                  <SubTab key={path}>{label}</SubTab>
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
            <MoreMenu
              onSelectionChange={(newKey: string) => setMenuKey(newKey)}
              triggerButton={
                <IconFrame
                  textValue="Menu"
                  clickable
                  size="large"
                  type="secondary"
                  icon={
                    <MoreIcon
                      width={16}
                      color={theme.colors['icon-light']}
                    />
                  }
                  css={{
                    backgroundColor: theme.colors['fill-two'],
                    '&:hover:not(:disabled)': {
                      backgroundColor: theme.colors['fill-two-hover'],
                    },
                  }}
                />
              }
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
            <ClusterPermissionsModal
              cluster={cluster!}
              open={menuKey === 'permissions'}
              onClose={() => setMenuKey('')}
            />
            <ClusterSettingsModal
              cluster={cluster!}
              open={menuKey === 'settings'}
              onClose={() => setMenuKey('')}
            />
          </div>
        </>
      }
    >
      <TabPanel
        css={{ height: '100%' }}
        stateRef={tabStateRef}
      >
        <PageHeaderContext value={pageHeaderContext}>
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
        </PageHeaderContext>
      </TabPanel>
    </ResponsivePageFullWidth>
  )
}

export type ClusterContextType = {
  cluster: ClusterFragment
  clusterLoading: boolean
  refetch: () => void
  refetchServices: () => void
  setRefetchServices: (refetch: () => () => void) => void
}

export function useClusterContext() {
  return useOutletContext<ClusterContextType>()
}
