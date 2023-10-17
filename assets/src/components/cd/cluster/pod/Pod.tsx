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
  CD_BASE_PATH,
  CLUSTERS_PATH,
  CLUSTER_PODS_PATH,
  POD_BASE_PATH,
  POD_PARAM_CLUSTER,
  POD_PARAM_NAME,
  POD_PARAM_NAMESPACE,
  getPodDetailsPath,
} from '../../../../routes/cdRoutesConsts'
import { usePodQuery } from '../../../../generated/graphql'
import PodSidecar from '../../../cluster/pods/PodSidecar'
import { useNamespaceIsApp } from '../../../hooks/useNamespaceIsApp'
import { LinkTabWrap } from '../../../utils/Tabs'
import { CD_CLUSTERS_BASE_CRUMBS } from '../../clusters/Clusters'

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
  const params = useParams()
  const namespace = (params[POD_PARAM_NAMESPACE] as string) || ''
  const directory = useGetDirectory(namespace)
  const tab = useMatch('/pods/:namespace/:name/:tab')?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path === tab)

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

export default function Pod() {
  const params = useParams()
  const clusterId = (params[POD_PARAM_CLUSTER] as string) || ''
  const namespace = (params[POD_PARAM_NAMESPACE] as string) || ''
  const name = (params[POD_PARAM_NAME] as string) || ''
  const tabStateRef = useRef<any>()
  const theme = useTheme()
  const tab = useMatch(`${POD_BASE_PATH}/:tab`)?.params?.tab || ''

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...CD_CLUSTERS_BASE_CRUMBS,
        {
          label: clusterId,
          url: `${CD_BASE_PATH}/${CLUSTERS_PATH}/${clusterId}`,
        },
        {
          label: 'pods',
          url: `${CD_BASE_PATH}/${CLUSTERS_PATH}/${clusterId}/${CLUSTER_PODS_PATH}`,
        },
        ...(clusterId && name && namespace
          ? [
              {
                label: name,
                url: getPodDetailsPath({ clusterId, name, namespace }),
              },
              ...(tab
                ? [
                    {
                      label: tab,
                      url: '',
                    },
                  ]
                : []),
            ]
          : []),
      ],
      [clusterId, name, namespace, tab]
    )
  )

  const { data } = usePodQuery({
    variables: { name, namespace, clusterId },
    pollInterval: 10 * 1000,
    fetchPolicy: 'cache-and-network',
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
