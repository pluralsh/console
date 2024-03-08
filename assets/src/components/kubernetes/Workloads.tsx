import { useTheme } from 'styled-components'
import {
  SubTab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ReactNode, Suspense, useMemo, useRef, useState } from 'react'
import { Outlet, useMatch, useOutletContext } from 'react-router-dom'

import {
  CRON_JOBS_REL_PATH,
  DAEMON_SETS_REL_PATH,
  DEPLOYMENTS_REL_PATH,
  JOBS_REL_PATH,
  PODS_REL_PATH,
  REPLICATION_CONTROLLERS_REL_PATH,
  REPLICA_SETS_REL_PATH,
  STATEFUL_SETS_REL_PATH,
  WORKLOADS_REL_PATH,
  getKubernetesAbsPath,
  getWorkloadsAbsPath,
} from '../../routes/kubernetesRoutesConsts'
import { LinkTabWrap } from '../utils/Tabs'
import { PluralErrorBoundary } from '../cd/PluralErrorBoundary'
import {
  PageHeaderContext,
  PageScrollableContext,
} from '../cd/ContinuousDeployment'
import LoadingIndicator from '../utils/LoadingIndicator'
import { ScrollablePage } from '../utils/layout/ScrollablePage'

import { KubernetesContext } from './Kubernetes'

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

export default function Workloads() {
  const theme = useTheme()
  const { cluster } = useOutletContext() as KubernetesContext
  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const [scrollable, setScrollable] = useState(false)

  const pageScrollableContext = useMemo(
    () => ({
      setScrollable,
    }),
    []
  )
  const pageHeaderContext = useMemo(
    () => ({
      setHeaderContent,
    }),
    []
  )

  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(
    `${getKubernetesAbsPath(cluster?.id)}/${WORKLOADS_REL_PATH}/:tab*`
  )
  // @ts-expect-error
  const tab = pathMatch?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path === tab)

  useSetBreadcrumbs(
    useMemo(
      () => [
        {
          label: 'kubernetes',
          url: getKubernetesAbsPath(cluster?.id),
        },
        {
          label: cluster?.name ?? '',
          url: getKubernetesAbsPath(cluster?.id),
        },
        {
          label: 'workloads',
          url: getWorkloadsAbsPath(cluster?.id),
        },
      ],
      [cluster]
    )
  )

  return (
    <ScrollablePage
      fullWidth
      scrollable={scrollable}
      headingContent={
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.large,
            flexGrow: 1,
            width: '100%',
            justifyContent: 'space-between',
            whiteSpace: 'nowrap',
          }}
        >
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
                to={`${getWorkloadsAbsPath(cluster?.id)}/${path}`}
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
          {headerContent}
        </div>
      }
    >
      <PluralErrorBoundary>
        <TabPanel
          css={{ height: '100%' }}
          stateRef={tabStateRef}
        >
          <PageHeaderContext.Provider value={pageHeaderContext}>
            <PageScrollableContext.Provider value={pageScrollableContext}>
              <Suspense fallback={<LoadingIndicator />}>
                <Outlet />
              </Suspense>
            </PageScrollableContext.Provider>
          </PageHeaderContext.Provider>
        </TabPanel>
      </PluralErrorBoundary>
    </ScrollablePage>
  )
}
