import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Flex } from 'honorable'
import { LoopingLogo } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { ResponsiveLayoutSidecarContainer } from 'components/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/layout/ResponsiveLayoutContentContainer'

import { useBreadcrumbs } from 'components/Breadcrumbs'

import { useQuery } from '@apollo/client'
import { Pod } from 'generated/graphql'

import { POD_INFO_Q } from '../queries'
import { POLL_INTERVAL } from '../constants'

import { statusesToRecord } from '../pods/PodInfo'

import PodShellShell from './ContainerShell'
import SideNav from './ContainerSideNav'
import Sidecar from './ContainerSidecar'

export default function PodShell() {
  const theme = useTheme()
  const { setBreadcrumbs } = useBreadcrumbs()

  const { name, namespace, container: containerName } = useParams()
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
        { text: 'nodes', url: '/nodes' }, // Add filter param here later maybe?
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

  const transformedData = useMemo(() => {
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
      container, containerStatus, pod, containers, initContainers,
    }
  }, [containerName, data])

  if (error || !transformedData) {
    return <>Could not find container "{containerName}"</>
  }
  if (!data) return <LoopingLogo />

  const {
    container, containerStatus, pod, containers = [], initContainers = [],
  } = transformedData

  return (
    <Flex
      height="100%"
      width="100%"
      overflowY="hidden"
      padding={theme.spacing.large}
      paddingLeft={theme.spacing.xlarge}
      paddingRight={theme.spacing.xlarge}
    >
      <ResponsiveLayoutSidenavContainer
        width={240}
      >
        <SideNav
          pod={pod}
          containers={containers}
          initContainers={initContainers}
        />
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutContentContainer overflow="visible">
        <PodShellShell />
      </ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutSidecarContainer width="200px">
        <Sidecar
          pod={pod}
          container={container}
          containerStatus={containerStatus}
        />
      </ResponsiveLayoutSidecarContainer>
    </Flex>
  )
}
