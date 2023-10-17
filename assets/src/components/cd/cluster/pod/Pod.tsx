import { useMemo, useRef } from 'react'
import { Outlet, useMatch, useParams } from 'react-router-dom'
import {
  Tab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'

import {
  POD_BASE_PATH,
  POD_PARAM_CLUSTER,
  POD_PARAM_NAME,
  POD_PARAM_NAMESPACE,
} from '../../../../routes/cdRoutesConsts'
import { usePodQuery } from '../../../../generated/graphql'
import PodSidecar from '../../../cluster/pods/PodSidecar'
import { useNamespaceIsApp } from '../../../hooks/useNamespaceIsApp'
import { LinkTabWrap } from '../../../utils/Tabs'

const useGetDirectory = (namespace = '') => {
  const namespaceIsApp = useNamespaceIsApp(namespace)

  return useMemo(() => {
    const showLogs = !namespaceIsApp

    return [
      { path: '', label: 'Info' },
      { path: 'events', label: 'Events' },
      { path: 'raw', label: 'Raw' },
      ...(showLogs ? [{ path: 'logs', label: 'Logs' }] : []),
    ]
  }, [namespaceIsApp])
}

function Sidenav({ tabStateRef = {} }: any) {
  const { namespace } = useParams()

  const subpath =
    useMatch('/pods/:namespace/:name/:subpath')?.params?.subpath || ''
  const directory = useGetDirectory(namespace)

  const currentTab = directory.find(({ path }) => path === subpath)

  return (
    <TabList
      stateRef={tabStateRef}
      stateProps={{
        orientation: 'vertical',
        selectedKey: currentTab?.path,
      }}
    >
      {directory.map(({ label, path }) => (
        <LinkTabWrap
          key={path}
          textValue={label}
          to={path}
        >
          <Tab>{label}</Tab>
        </LinkTabWrap>
      ))}
    </TabList>
  )
}
const POLL_INTERVAL = 10 * 1000

export default function Pod() {
  const params = useParams()
  const clusterId = (params[POD_PARAM_CLUSTER] as string) || ''
  const namespace = (params[POD_PARAM_NAMESPACE] as string) || ''
  const name = (params[POD_PARAM_NAME] as string) || ''

  const tabStateRef = useRef<any>()
  const theme = useTheme()
  const tab = useMatch(`${POD_BASE_PATH}/:tab`)?.params?.tab || ''

  const breadcrumbs = useMemo(
    () => [
      { label: 'pods', url: '/pods' },
      ...(namespace ? [{ label: namespace, url: `/pods/${namespace}` }] : []),
      ...(namespace && name
        ? [{ label: name, url: `/pods/${namespace}/${name}` }]
        : []),
      ...(tab && namespace && name
        ? [{ label: tab, url: `/pods/${namespace}/${name}/${tab}` }]
        : []),
    ],
    [name, namespace, tab]
  )

  useSetBreadcrumbs(breadcrumbs)

  const { data } = usePodQuery({
    variables: { name, namespace, clusterId },
    pollInterval: POLL_INTERVAL,
  })

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer paddingTop={40 + theme.spacing.medium}>
        <Sidenav tabStateRef={tabStateRef} />
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <TabPanel
        as={<ResponsiveLayoutContentContainer overflow="visible" />}
        stateRef={tabStateRef}
      >
        <Outlet context={{ pod: data?.pod }} />
      </TabPanel>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutSidecarContainer>
        <PodSidecar pod={data?.pod} />
      </ResponsiveLayoutSidecarContainer>
    </ResponsiveLayoutPage>
  )
}
