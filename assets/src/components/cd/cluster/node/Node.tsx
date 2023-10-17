import { useEffect, useMemo, useRef } from 'react'
import { Outlet, useMatch, useParams } from 'react-router-dom'
import {
  Breadcrumb,
  SubTab,
  TabList,
  TabPanel,
  useBreadcrumbs,
} from '@pluralsh/design-system'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import { LinkTabWrap } from 'components/utils/Tabs'

import {
  CD_BASE_PATH,
  NODE_BASE_PATH,
  NODE_PARAM_CLUSTER,
  NODE_PARAM_NAME,
  getNodeDetailsPath,
} from '../../../../routes/cdRoutesConsts'
import { CD_BASE_CRUMBS } from '../../ContinuousDeployment'
import { useNodeMetricQuery, useNodeQuery } from '../../../../generated/graphql'

export const getNodeDetailsBreadcrumbs = ({
  clusterId,
  name,
}: {
  clusterId?: string | null
  name?: string | null
}) => [
  ...CD_BASE_CRUMBS,
  { label: 'clusters', url: `${CD_BASE_PATH}/clusters` },
  { label: clusterId || '', url: `${CD_BASE_PATH}/clusters/${clusterId}` },
  { label: 'nodes', url: `${CD_BASE_PATH}/clusters/${clusterId}/nodes` },
  ...(clusterId && name
    ? [
        {
          label: name,
          url: getNodeDetailsPath({ clusterId, name }),
        },
      ]
    : []),
]

const DIRECTORY = [
  { path: '', label: 'Info' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
  { path: 'metadata', label: 'Metadata' },
] as const

const POLL_INTERVAL = 10 * 1000

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
  const name = (params[NODE_PARAM_NAME] as string) || ''
  const clusterId = (params[NODE_PARAM_CLUSTER] as string) || ''

  const tabStateRef = useRef<any>()
  const tab = useMatch(`${NODE_BASE_PATH}/:tab`)?.params?.tab || ''

  const currentTab = DIRECTORY.find(({ path }) => path === tab)
  const { setBreadcrumbs } = useBreadcrumbs()

  const breadcrumbs: Breadcrumb[] = useMemo(
    () => [...getNodeDetailsBreadcrumbs({ clusterId, name })],
    [clusterId, name]
  )

  useEffect(() => setBreadcrumbs(breadcrumbs), [setBreadcrumbs, breadcrumbs])

  const { data } = useNodeQuery({
    variables: { name, clusterId },
    pollInterval: POLL_INTERVAL,
  })

  const { data: nodeMetricData } = useNodeMetricQuery({
    variables: { name, clusterId },
    pollInterval: POLL_INTERVAL,
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
