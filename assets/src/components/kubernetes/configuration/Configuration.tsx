import { Outlet, useMatch, useOutletContext } from 'react-router-dom'
import {
  SubTab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Suspense, useMemo, useRef, useState } from 'react'

import {
  CONFIG_MAPS_REL_PATH,
  SECRETS_REL_PATH,
  getConfigurationAbsPath,
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

import { KubernetesOutletContext } from '../Kubernetes'

const directory = [
  { path: CONFIG_MAPS_REL_PATH, label: 'Config maps' },
  { path: SECRETS_REL_PATH, label: 'Secrets' },
] as const

export default function Configuration() {
  const { cluster } = useOutletContext() as KubernetesOutletContext
  const [scrollable, setScrollable] = useState(false)

  const pageScrollableContext = useMemo(
    () => ({
      setScrollable,
    }),
    []
  )

  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`${getConfigurationAbsPath(cluster?.id)}/:tab*`)
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
          label: 'configuration',
          url: getConfigurationAbsPath(cluster?.id),
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
            to={`${getConfigurationAbsPath(cluster?.id)}/${path}`}
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
