import { Outlet, useMatch } from 'react-router-dom'
import { SubTab, TabList, TabPanel } from '@pluralsh/design-system'
import { Suspense, useMemo, useRef, useState } from 'react'

import {
  EVENTS_REL_PATH,
  NAMESPACES_REL_PATH,
  NODES_REL_PATH,
  getClusterAbsPath,
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
  { path: NODES_REL_PATH, label: 'Nodes' },
  { path: EVENTS_REL_PATH, label: 'Events' },
  { path: NAMESPACES_REL_PATH, label: 'Namespaces' },
] as const

export default function Cluster() {
  const { cluster } = useKubernetesContext()
  const [scrollable, setScrollable] = useState(false)

  const pageScrollableContext = useMemo(
    () => ({
      setScrollable,
    }),
    []
  )

  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`${getClusterAbsPath(cluster?.id)}/:tab/*`)
  const tab = pathMatch?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path === tab)

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
            to={`${getClusterAbsPath(cluster?.id)}/${path}`}
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
