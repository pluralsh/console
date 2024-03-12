import { Outlet, useMatch, useOutletContext } from 'react-router-dom'
import {
  SubTab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Suspense, useMemo, useRef, useState } from 'react'

import {
  INGRESSES_REL_PATH,
  INGRESS_CLASSES_REL_PATH,
  NETWORK_POLICIES_REL_PATH,
  SERVICES_REL_PATH,
  getDiscoveryAbsPath,
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

import { KubernetesOutletContextT } from '../Kubernetes'

const directory = [
  { path: SERVICES_REL_PATH, label: 'Services' },
  { path: INGRESSES_REL_PATH, label: 'Ingresses' },
  { path: INGRESS_CLASSES_REL_PATH, label: 'Ingress classes' },
  { path: NETWORK_POLICIES_REL_PATH, label: 'Network policies' },
] as const

export default function Discovery() {
  const { cluster } = useOutletContext() as KubernetesOutletContextT
  const [scrollable, setScrollable] = useState(false)

  const pageScrollableContext = useMemo(
    () => ({
      setScrollable,
    }),
    []
  )

  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`${getDiscoveryAbsPath(cluster?.id)}/:tab/*`)
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
          label: 'discovery',
          url: getDiscoveryAbsPath(cluster?.id),
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
            to={`${getDiscoveryAbsPath(cluster?.id)}/${path}`}
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
