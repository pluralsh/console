import { useEffect, useMemo, useRef } from 'react'
import {
  Outlet,
  useMatch,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import {
  EmptyState,
  LoopingLogo,
  SubTab,
  TabList,
  TabPanel,
} from '@pluralsh/design-system'

import { useBreadcrumbs } from 'components/layout/Breadcrumbs'

import { useQuery } from '@apollo/client'
import {
  ContainerStatus,
  Container as ContainerT,
  Maybe,
  Pod,
} from 'generated/graphql'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import { LinkTabWrap } from 'components/utils/Tabs'

import { POD_INFO_Q } from '../queries'
import { POLL_INTERVAL } from '../constants'

import { statusesToRecord } from '../pods/PodInfo'

const DIRECTORY = [
  { path: '', label: 'Cloud shell' },
  { path: 'metadata', label: 'Metadata' },
] as const

function HeadingTabList({ tabStateRef }: any) {
  const subpath
    = useMatch('/pods/:namespace/:name/shell/:container/:subpath')?.params
      ?.subpath || ''
  const currentTab = DIRECTORY.find(({ path }) => path === subpath)

  console.log('subpath', subpath)
  console.log('currentTab', currentTab)

  return (
    <TabList
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

type ContainerContext = {
  container: Maybe<ContainerT> | undefined
  containerStatus: Maybe<ContainerStatus>
  pod: Pod
  containers: Maybe<ContainerT>[]
  initContainers: Maybe<ContainerT>[]
}

export default function Container() {
  const {
    name, namespace, container: containerName, subpath,
  } = useParams()
  const { setBreadcrumbs } = useBreadcrumbs()
  const tabStateRef = useRef<any>()

  const { data, error } = useQuery<{ pod: Pod }>(POD_INFO_Q, {
    variables: { name, namespace },
    pollInterval: POLL_INTERVAL,
  })

  // TODO: Investigate whether these links could more specific,
  // based on where they navigated from, perhaps the `namespace` crumb
  // could navigate to the Pods view already filtered for that namespace
  useEffect(() => {
    if (name && namespace && containerName) {
      setBreadcrumbs([
        { text: 'pods', url: '/pods' }, // Add filter param here later maybe?
        { text: name, url: `/pods/${namespace}/${name}` },
        { text: 'containers' }, // Add filter param here later maybe?
        {
          text: containerName,
          url: `/pods/${namespace}/${name}/shell/${containerName}`,
        },
      ])
    }
  }, [containerName, name, namespace, setBreadcrumbs])

  const transformedData: ContainerContext | undefined = useMemo(() => {
    if (!data?.pod) {
      return undefined
    }
    const { pod } = data

    const containerStatuses = statusesToRecord(pod?.status?.containerStatuses)
    const initContainerStatuses = statusesToRecord(pod?.status?.initContainerStatuses)
    const containers = pod.spec.containers || []
    const initContainers = pod.spec.initContainers || []

    const container
      = containers?.find(cont => cont?.name === containerName)
      || initContainers?.find(cont => cont?.name === containerName)

    const containerStatus = !container?.name
      ? null
      : containerStatuses[container?.name]
        || initContainerStatuses[container?.name]

    return {
      container,
      containerStatus,
      pod,
      containers,
      initContainers,
    }
  }, [containerName, data])

  if (error || (data && !transformedData)) {
    return (
      <EmptyState message={`Could not find container "${containerName}"`} />
    )
  }
  if (!data) return <LoopingLogo />

  return (
    <ResponsivePageFullWidth
      scrollable={false}
      heading={containerName}
      headingContent={<HeadingTabList tabStateRef={tabStateRef} />}
    >
      <TabPanel
        stateRef={tabStateRef}
        height="100%"
      >
        <Outlet context={transformedData} />
      </TabPanel>
    </ResponsivePageFullWidth>
  )
}

export function useContainer() {
  return useOutletContext<ContainerContext>()
}
