import { useTheme } from 'styled-components'
import { Outlet, useMatch, useOutletContext } from 'react-router-dom'
import {
  SubTab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ReactNode, Suspense, useMemo, useRef, useState } from 'react'

import {
  CONFIGURATION_REL_PATH,
  CONFIG_MAPS_REL_PATH,
  SECRETS_REL_PATH,
  WORKLOADS_REL_PATH,
  getConfigurationAbsPath,
  getKubernetesAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { ScrollablePage } from '../../utils/layout/ScrollablePage'
import { LinkTabWrap } from '../../utils/Tabs'
import { PluralErrorBoundary } from '../../cd/PluralErrorBoundary'
import {
  PageHeaderContext,
  PageScrollableContext,
} from '../../cd/ContinuousDeployment'
import LoadingIndicator from '../../utils/LoadingIndicator'

import { KubernetesContext } from '../Kubernetes'

const directory = [
  { path: CONFIG_MAPS_REL_PATH, label: 'Config maps' },
  { path: SECRETS_REL_PATH, label: 'Secrets' },
] as const

export default function Configuration() {
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
          label: 'configuration',
          url: getConfigurationAbsPath(cluster?.id),
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
