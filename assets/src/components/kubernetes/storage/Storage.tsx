import { Outlet, useLocation, useMatch } from 'react-router-dom'
import { SubTab, TabList, TabPanel } from '@pluralsh/design-system'
import { Suspense, useMemo, useRef } from 'react'

import {
  PERSISTENT_VOLUMES_REL_PATH,
  PERSISTENT_VOLUME_CLAIMS_REL_PATH,
  STORAGE_CLASSES_REL_PATH,
  getStorageAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { ScrollablePage } from '../../utils/layout/ScrollablePage'
import { LinkTabWrap } from '../../utils/Tabs'
import { PluralErrorBoundary } from '../../cd/PluralErrorBoundary'
import { useSetPageHeaderContent } from '../../cd/ContinuousDeployment'
import LoadingIndicator from '../../utils/LoadingIndicator'

import { useCluster } from '../Cluster'
import { Maybe } from '../../../generated/graphql-kubernetes'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import { getBaseBreadcrumbs } from '../common/utils'

export const getStorageBreadcrumbs = (
  cluster?: Maybe<KubernetesClusterFragment>
) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'storage',
    url: getStorageAbsPath(cluster?.id),
  },
]

const directory = [
  {
    path: PERSISTENT_VOLUME_CLAIMS_REL_PATH,
    label: 'Persistent volume claims',
  },
  { path: PERSISTENT_VOLUMES_REL_PATH, label: 'Persistent volumes' },
  { path: STORAGE_CLASSES_REL_PATH, label: 'Storage classes' },
] as const

export default function Storage() {
  const cluster = useCluster()
  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`${getStorageAbsPath(cluster?.id)}/:tab/*`)
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
            to={`${getStorageAbsPath(cluster?.id)}/${path}${search}`}
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
