import { useMemo, useRef } from 'react'
import { Outlet, useMatch, useParams } from 'react-router-dom'
import {
  SubTab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { LinkTabWrap } from 'components/utils/Tabs'

import {
  NODE_ABS_PATH,
  NODE_PARAM_CLUSTER,
  NODE_PARAM_NAME,
  getNodeDetailsPath,
} from '../../../../routes/cdRoutesConsts'
import {
  useClusterQuery,
  useNodeMetricQuery,
  useNodeQuery,
} from '../../../../generated/graphql'
import { getClusterBreadcrumbs } from '../Cluster'

const DIRECTORY = [
  { path: '', label: 'Info' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
  { path: 'metadata', label: 'Metadata' },
] as const

function HeadingTabList({ tabStateRef, currentTab }: any) {
  return (
    <TabList
      gap="xxsmall"
      stateRef={tabStateRef}
      stateProps={{
        orientation: 'horizontal',
        selectedKey: currentTab?.path,
      }}
    >
      {DIRECTORY.map(({ label, path }) => (
        <LinkTabWrap
          key={path}
          textValue={label}
          to={path}
          subTab
        >
          <SubTab>{label}</SubTab>
        </LinkTabWrap>
      ))}
    </TabList>
  )
}

export default function Node() {
  const params = useParams()
  const name = (params[NODE_PARAM_NAME] as string)!
  const clusterId = (params[NODE_PARAM_CLUSTER] as string)!
  const tabStateRef = useRef<any>()
  const tab = useMatch(`${NODE_ABS_PATH}/:tab`)?.params?.tab || ''
  const currentTab = DIRECTORY.find(({ path }) => path === tab)

  const { data: clusterData } = useClusterQuery({
    variables: { id: clusterId },
    fetchPolicy: 'cache-and-network',
  })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getClusterBreadcrumbs({
          cluster: clusterData?.cluster || { id: clusterId },
          tab: 'nodes',
        }),
        ...(clusterId && name
          ? [
              {
                label: name,
                url: getNodeDetailsPath({ clusterId, name }),
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
      [clusterData?.cluster, clusterId, name, tab]
    )
  )

  const { data } = useNodeQuery({
    variables: { name, clusterId },
    pollInterval: 10 * 1000,
  })

  const { data: nodeMetricData } = useNodeMetricQuery({
    variables: { name, clusterId },
    pollInterval: 10 * 1000,
  })

  return (
    <TabPanel
      stateRef={tabStateRef}
      as={
        <ResponsivePageFullWidth
          scrollable={
            (currentTab?.label ?? 'Info') === 'Info' ||
            currentTab?.label === 'Metadata'
          }
          heading={name}
          headingContent={
            <HeadingTabList
              tabStateRef={tabStateRef}
              currentTab={currentTab}
            />
          }
          // eslint-disable-next-line react/no-children-prop
          children={
            <Outlet
              context={{
                node: data?.node,
                nodeMetric: nodeMetricData?.nodeMetric,
              }}
            />
          }
        />
      }
    />
  )
}
