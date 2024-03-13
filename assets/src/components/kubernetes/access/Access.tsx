import { Outlet, useMatch } from 'react-router-dom'
import {
  SubTab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Suspense, useMemo, useRef, useState } from 'react'

import {
  CLUSTER_ROLES_REL_PATH,
  CLUSTER_ROLE_BINDINGS_REL_PATH,
  ROLES_REL_PATH,
  ROLE_BINDINGS_REL_PATH,
  getAccessAbsPath,
  getKubernetesAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { ScrollablePage } from '../../utils/layout/ScrollablePage'
import { LinkTabWrap } from '../../utils/Tabs'
import { PluralErrorBoundary } from '../../cd/PluralErrorBoundary'
import {
  PageScrollableContext,
  useSetPageHeaderContent,
} from '../../cd/ContinuousDeployment'
import LoadingIndicator from '../../utils/LoadingIndicator'

import { useKubernetesContext } from '../Kubernetes'

const directory = [
  { path: ROLES_REL_PATH, label: 'Roles' },
  { path: ROLE_BINDINGS_REL_PATH, label: 'Role bindings' },
  { path: CLUSTER_ROLES_REL_PATH, label: 'Cluster roles' },
  { path: CLUSTER_ROLE_BINDINGS_REL_PATH, label: 'Cluster role bindings' },
] as const

export default function Access() {
  const { cluster } = useKubernetesContext()
  const [scrollable, setScrollable] = useState(false)

  const pageScrollableContext = useMemo(
    () => ({
      setScrollable,
    }),
    []
  )

  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`${getAccessAbsPath(cluster?.id)}/:tab/*`)
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
          label: 'access',
          url: getAccessAbsPath(cluster?.id),
        },
      ],
      [cluster]
    )
  )

  const headerContent = useMemo(
    () => (
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
            to={`${getAccessAbsPath(cluster?.id)}/${path}`}
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
    [cluster, currentTab]
  )

  useSetPageHeaderContent(headerContent)

  return (
    <ScrollablePage
      fullWidth
      scrollable={scrollable}
    >
      <PluralErrorBoundary>
        <TabPanel
          css={{ height: '100%' }}
          stateRef={tabStateRef}
        >
          <PageScrollableContext.Provider value={pageScrollableContext}>
            <Suspense fallback={<LoadingIndicator />}>
              <Outlet />
            </Suspense>
          </PageScrollableContext.Provider>
        </TabPanel>
      </PluralErrorBoundary>
    </ScrollablePage>
  )
}
