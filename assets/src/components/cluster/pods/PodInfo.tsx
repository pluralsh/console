import { useContext, useEffect } from 'react'
import { useQuery } from 'react-apollo'
import { useParams } from 'react-router-dom'
import { ArcElement, Chart } from 'chart.js'
import styled from 'styled-components'
import { Flex } from 'honorable'

import { LoopingLogo } from 'components/utils/AnimatedLogo'
import { BreadcrumbsContext } from 'components/Breadcrumbs'

import { ScrollablePage } from 'components/layout/ScrollablePage'

import { ContainerStatus, Maybe, Pod } from 'generated/graphql'

import { POLL_INTERVAL } from '../constants'
import { POD_Q } from '../queries'

import { SubTitle } from '../nodes/SubTitle'

import { ContainerList } from './ContainerList'

/*
Must explicitly import and register chart.js elements used in react-chartjs-2
*/
Chart.register(ArcElement)

const statusesToRecord = (statuses?:Maybe<Maybe<ContainerStatus>[]>) => (statuses || []).reduce((acc, container) => ({
  ...acc,
  ...(typeof container?.name === 'string' ? { [container.name]: container } : {}),
}),
    {} as Record<string, Maybe<ContainerStatus>>)

export default function NodeInfo() {
  const { name, namespace } = useParams()
  const { data } = useQuery<{ pod: Pod } & { events: Event }>(POD_Q, {
    variables: { name, namespace },
    pollInterval: POLL_INTERVAL,
  })

  if (!data) return <LoopingLogo dark />

  const { pod } = data
  const containerStatuses = statusesToRecord(pod?.status?.containerStatuses)
  const initContainerStatuses = statusesToRecord(pod?.status?.initContainerStatuses)
  const containers = pod.spec.containers || []
  const initContainers = pod.spec.initContainers || []

  console.log({
    containers,
    initContainers,
    initContainerStatus: initContainerStatuses,
    containerStatus: containerStatuses,
  })

  return (
    <ScrollablePage heading="Info">
      <Flex
        direction="column"
        gap="xlarge"
      >
        <SubTitle>Containers</SubTitle>
        <ContainerList
          containers={containers}
          containerStatuses={containerStatuses}
          initContainers={containers}
          initContainerStatuses={containerStatuses}
        />
        {/* <section>
          <SubTitle>Pods</SubTitle>
          <PodList
            pods={node.pods}
            refetch={refetch}
            namespace={undefined}
          />
        </section>
        <section>
          <SubTitle>Overview</SubTitle>
          <Card padding="medium">
            <NodeGraphs
              status={node.status}
              pods={node.pods}
              name={name}
              usage={nodeMetric.usage}
            />
          </Card>
        </section>
        <section>
          <Metadata metadata={node.metadata} />
        </section> */}
      </Flex>
    </ScrollablePage>
  )
}
