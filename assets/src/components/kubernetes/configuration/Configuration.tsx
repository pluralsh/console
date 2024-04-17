import { Outlet, useLocation, useMatch } from 'react-router-dom'
import { SubTab, TabList, TabPanel } from '@pluralsh/design-system'
import { Suspense, useMemo, useRef } from 'react'

import {
  CONFIG_MAPS_REL_PATH,
  SECRETS_REL_PATH,
  getConfigurationAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { LinkTabWrap } from '../../utils/Tabs'
import { PluralErrorBoundary } from '../../cd/PluralErrorBoundary'
import { useSetPageHeaderContent } from '../../cd/ContinuousDeployment'
import LoadingIndicator from '../../utils/LoadingIndicator'

import { useCluster } from '../Cluster'
import { Maybe } from '../../../generated/graphql-kubernetes'
import { ClusterTinyFragment } from '../../../generated/graphql'
import { getBaseBreadcrumbs } from '../common/utils'

export const getConfigurationBreadcrumbs = (
  cluster?: Maybe<ClusterTinyFragment>
) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'configuration',
    url: getConfigurationAbsPath(cluster?.id),
  },
]

const directory = [
  { path: CONFIG_MAPS_REL_PATH, label: 'Config maps' },
  { path: SECRETS_REL_PATH, label: 'Secrets' },
] as const

export default function Configuration() {
  const cluster = useCluster()
  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`${getConfigurationAbsPath(cluster?.id)}/:tab/*`)
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
        marginRight="medium"
        paddingBottom="xxsmall"
      >
        {directory.map(({ label, path }) => (
          <LinkTabWrap
            subTab
            key={path}
            textValue={label}
            to={`${getConfigurationAbsPath(cluster?.id)}/${path}${search}`}
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
  )
}
