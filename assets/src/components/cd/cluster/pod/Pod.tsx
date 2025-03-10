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

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { GqlError } from 'components/utils/Alert'

import {
  POD_ABS_PATH,
  POD_PARAM_CLUSTER,
  POD_PARAM_NAME,
  POD_PARAM_NAMESPACE,
  getPodDetailsPath,
} from '../../../../routes/cdRoutesConsts'
import { useClusterQuery, usePodQuery } from '../../../../generated/graphql'
import { LinkTabWrap } from '../../../utils/Tabs'
import LogsLegend from '../../logs/LogsLegend.tsx'
import { getClusterBreadcrumbs } from '../Cluster'
import PodSidecar from './PodSidecar.tsx'

const DIRECTORY = [
  { path: '', label: 'Info' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
  { path: 'logs', label: 'Logs' },
  { path: 'shell', label: 'Shell' },
]

export default function Pod() {
  const params = useParams()
  const clusterId = (params[POD_PARAM_CLUSTER] as string)!
  const namespace = (params[POD_PARAM_NAMESPACE] as string)!
  const name = (params[POD_PARAM_NAME] as string)!
  const tabStateRef = useRef<any>(undefined)
  const theme = useTheme()
  const tab = useMatch(`${POD_ABS_PATH}/:tab`)?.params?.tab || ''
  const currentTab = DIRECTORY.find(({ path }) => path === tab)

  const { data: clusterData } = useClusterQuery({
    variables: { id: clusterId },
  })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getClusterBreadcrumbs({
          cluster: clusterData?.cluster || { id: clusterId },
          tab: 'pods',
        }),
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
      [clusterData?.cluster, clusterId, name, namespace, tab]
    )
  )

  const { data, error } = usePodQuery({
    variables: { name, namespace, clusterId },
    pollInterval: 10 * 1000,
    fetchPolicy: 'cache-and-network',
  })

  const pod = data?.pod

  if (error) {
    return <GqlError error={error} />
  }
  if (!pod) {
    return <LoadingIndicator />
  }

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer
        css={{ paddingTop: 40 + theme.spacing.medium }}
      >
        <TabList
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'vertical',
            selectedKey: currentTab?.path,
          }}
        >
          {DIRECTORY.map(({ label, path }) => (
            <LinkTabWrap
              key={path}
              textValue={label}
              to={path}
            >
              <Tab>{label}</Tab>
            </LinkTabWrap>
          ))}
        </TabList>
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <TabPanel
        as={<ResponsiveLayoutContentContainer css={{ overflow: 'visible' }} />}
        stateRef={tabStateRef}
      >
        <Outlet context={{ pod }} />
      </TabPanel>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutSidecarContainer
        css={{
          gap: theme.spacing.medium,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <PodSidecar
          pod={pod}
          clusterId={clusterId}
        />
        {tab === 'logs' && <LogsLegend />}
      </ResponsiveLayoutSidecarContainer>
    </ResponsiveLayoutPage>
  )
}
