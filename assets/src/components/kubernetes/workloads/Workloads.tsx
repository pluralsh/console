import { SubTab, TabList, TabPanel } from '@pluralsh/design-system'
import { Suspense, useMemo, useRef } from 'react'
import { Outlet, useLocation, useMatch } from 'react-router-dom'

import {
  CRON_JOBS_REL_PATH,
  DAEMON_SETS_REL_PATH,
  DEPLOYMENTS_REL_PATH,
  JOBS_REL_PATH,
  PODS_REL_PATH,
  REPLICATION_CONTROLLERS_REL_PATH,
  REPLICA_SETS_REL_PATH,
  STATEFUL_SETS_REL_PATH,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { LinkTabWrap } from '../../utils/Tabs'
import { PluralErrorBoundary } from '../../cd/PluralErrorBoundary'
import { useSetPageHeaderContent } from '../../cd/ContinuousDeployment'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { ScrollablePage } from '../../utils/layout/ScrollablePage'
import { useCluster } from '../Cluster'
import { Maybe } from '../../../generated/graphql-kubernetes'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import { getBaseBreadcrumbs } from '../common/utils'

const directory = [
  { path: DEPLOYMENTS_REL_PATH, label: 'Deployments' },
  { path: PODS_REL_PATH, label: 'Pods' },
  { path: REPLICA_SETS_REL_PATH, label: 'Replica sets' },
  { path: STATEFUL_SETS_REL_PATH, label: 'Stateful sets' },
  { path: DAEMON_SETS_REL_PATH, label: 'Daemon sets' },
  { path: JOBS_REL_PATH, label: 'Jobs' },
  { path: CRON_JOBS_REL_PATH, label: 'Cron jobs' },
  { path: REPLICATION_CONTROLLERS_REL_PATH, label: 'Replication controllers' },
] as const

export const getWorkloadsBreadcrumbs = (
  cluster?: Maybe<KubernetesClusterFragment>
) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'workloads',
    url: getWorkloadsAbsPath(cluster?.id),
  },
]

export default function Workloads() {
  const cluster = useCluster()
  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`${getWorkloadsAbsPath(cluster?.id)}/:tab/*`)
  const tab = pathMatch?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path === tab)
  const { search } = useLocation()

  const headerContent = useMemo(
    () => (
      <TabList
        scrollable
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
            to={`${getWorkloadsAbsPath(cluster?.id)}/${path}${search}`}
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
    ),
    [cluster?.id, currentTab?.path, search]
  )

  useSetPageHeaderContent(headerContent)

  return (
    <ScrollablePage
      fullWidth
      scrollable={false}
    >
      <PluralErrorBoundary>
        <TabPanel
          css={{ height: '100%' }}
          stateRef={tabStateRef}
        >
          <Suspense fallback={<LoadingIndicator />}>
            <Outlet />
          </Suspense>
        </TabPanel>
      </PluralErrorBoundary>
    </ScrollablePage>
  )
}
