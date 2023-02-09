import { useEffect, useMemo, useRef } from 'react'
import {
  Outlet,
  useMatch,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import {
  EmptyState,
  ListBoxItem,
  LoopingLogo,
  Select,
  SelectButton,
  SubTab,
  TabList,
  TabPanel,
} from '@pluralsh/design-system'
import { Flex } from 'honorable'
import styled from 'styled-components'
import { useQuery } from '@apollo/client'
import {
  ContainerStatus,
  Container as ContainerT,
  Maybe,
  Pod,
} from 'generated/graphql'

import { useBreadcrumbs } from 'components/layout/Breadcrumbs'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { LinkTabWrap } from 'components/utils/Tabs'

import { POD_INFO_Q } from '../queries'
import { POLL_INTERVAL } from '../constants'
import { statusesToRecord } from '../pods/PodInfo'

const DIRECTORY = [
  { path: '', label: 'Cloud shell' },
  { path: 'metadata', label: 'Metadata' },
] as const

function HeadingTabList({ tabStateRef, subpath }: any) {
  const currentTab = DIRECTORY.find(({ path }) => path === subpath)

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

type ContainerContext = {
  container: Maybe<ContainerT> | undefined
  containerStatus: Maybe<ContainerStatus>
  pod: Pod
  containers: Maybe<ContainerT>[]
  initContainers: Maybe<ContainerT>[]
}

const SelectTrigger = styled(SelectButton)({
  minWidth: 230,
})

export default function Container() {
  const { name, namespace, container: containerName } = useParams()
  const { setBreadcrumbs } = useBreadcrumbs()
  const tabStateRef = useRef<any>()
  const navigate = useNavigate()

  const match = useMatch('/pods/:namespace/:name/shell/:container/:subpath')
  const subpath = match?.params?.subpath || ''
  const currentTab = DIRECTORY.find(({ path }) => path === subpath)

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

  const { initContainers, containers, pod } = { ...transformedData }

  if (error || (data && !transformedData)) {
    return (
      <EmptyState message={`Could not find container "${containerName}"`} />
    )
  }
  if (!data) return <LoopingLogo />

  return (
    <ResponsivePageFullWidth
      scrollable={currentTab?.path === 'metadata'}
      heading={containerName}
      headingContent={(
        <Flex gap="medium">
          <HeadingTabList
            subpath={subpath}
            tabStateRef={tabStateRef}
          />
          {(initContainers || containers) && (
            <Select
              width="100%"
              placement="right"
              selectedKey={containerName}
              onSelectionChange={toContainerName => {
                navigate(`/pods/${pod?.metadata.namespace}/${
                  pod?.metadata.name
                }/shell/${toContainerName}${subpath ? `/${subpath}` : ''}`)
              }}
              triggerButton={<SelectTrigger>{containerName}</SelectTrigger>}
            >
              {[
                ...(initContainers || []).map((container, i) => (
                  <ListBoxItem
                    key={`init: ${container?.name || i}`}
                    label={container?.name ? `init: ${container?.name}` : ''}
                    textValue={
                      container?.name ? `init: ${container?.name}` : ''
                    }
                  />
                )),
                ...(containers || []).map((container, i) => (
                  <ListBoxItem
                    key={container?.name || `${i}`}
                    label={container?.name || ''}
                    textValue={container?.name || ''}
                  />
                )),
              ]}
            </Select>
          )}
        </Flex>
      )}
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
