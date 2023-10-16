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
import { useClusterQuery } from '../../../../generated/graphql'

export const getNodeDetailsBreadcrumbs = ({
  clusterId,
  nodeName,
}: {
  clusterId: string | null | undefined
  nodeName: string | null | undefined
}) => [
  ...CD_BASE_CRUMBS,
  { label: 'clusters', url: `${CD_BASE_PATH}/clusters` },
  { label: clusterId || '', url: `${CD_BASE_PATH}/clusters/${clusterId}` },
  { label: 'nodes', url: `${CD_BASE_PATH}/clusters/${clusterId}/nodes` },
  ...(clusterId && nodeName
    ? [
        {
          label: nodeName,
          url: getNodeDetailsPath({ clusterId, nodeName }),
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
  const nodeName = params[NODE_PARAM_NAME] as string
  const clusterId = params[NODE_PARAM_CLUSTER] as string

  const tabStateRef = useRef<any>()
  const subpath = useMatch(NODE_BASE_PATH)?.params?.subpath || ''

  const currentTab = DIRECTORY.find(({ path }) => path === subpath)
  const { setBreadcrumbs } = useBreadcrumbs()

  const breadcrumbs: Breadcrumb[] = useMemo(
    () => [...getNodeDetailsBreadcrumbs({ clusterId, nodeName })],
    [clusterId, nodeName]
  )

  useEffect(() => setBreadcrumbs(breadcrumbs), [setBreadcrumbs, breadcrumbs])

  // TODO: Use dedicated query once its available.
  const { data } = useClusterQuery({
    variables: { id: clusterId || '' },
    pollInterval: POLL_INTERVAL,
  })

  const node: any = useMemo(
    () =>
      data?.cluster?.nodes?.find((node) => node?.metadata?.name === nodeName),
    [data?.cluster?.nodes, nodeName]
  )

  const nodeMetric: any = useMemo(
    () =>
      data?.cluster?.nodeMetrics?.find(
        (nodeMetric) => nodeMetric?.metadata?.name === nodeName
      ),
    [data?.cluster?.nodeMetrics, nodeName]
  )

  return (
    <TabPanel
      stateRef={tabStateRef}
      as={
        <ResponsivePageFullWidth
          scrollable={
            (currentTab?.label ?? 'Info') === 'Info' ||
            currentTab?.label === 'Metadata'
          }
          heading={nodeName}
          headingContent={
            <HeadingTabList
              tabStateRef={tabStateRef}
              currentTab={currentTab}
            />
          }
          // eslint-disable-next-line react/no-children-prop
          children={<Outlet context={{ node, nodeMetric }} />}
        />
      }
    />
  )
}
