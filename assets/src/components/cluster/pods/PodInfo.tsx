import { useQuery } from 'react-apollo'
import { useParams } from 'react-router-dom'
import { ArcElement, Chart } from 'chart.js'
import { Flex } from 'honorable'

import { LoopingLogo } from '@pluralsh/design-system'

import { ScrollablePage } from 'components/layout/ScrollablePage'

import { ContainerStatus, Maybe, Pod } from 'generated/graphql'

import { POLL_INTERVAL } from '../constants'
import { POD_INFO_Q } from '../queries'

import { SubTitle } from '../nodes/SubTitle'

import { ContainersList } from '../containers/ContainersList'

import PodMetadata from './PodMetadata'

/*
Must explicitly import and register chart.js elements used in react-chartjs-2
*/
Chart.register(ArcElement)

export const statusesToRecord = (statuses?: Maybe<Maybe<ContainerStatus>[]>) => (statuses || []).reduce((acc, container) => ({
  ...acc,
  ...(typeof container?.name === 'string'
    ? { [container.name]: container }
    : {}),
}),
    {} as Record<string, Maybe<ContainerStatus>>)

export default function NodeInfo() {
  const { name, namespace } = useParams()
  const { data } = useQuery<{ pod: Pod }>(POD_INFO_Q, {
    variables: { name, namespace },
    pollInterval: POLL_INTERVAL,
  })

  if (!name || !namespace) {
    return null
  }
  if (!data) return <LoopingLogo />

  const { pod } = data
  const containerStatuses = statusesToRecord(pod?.status?.containerStatuses)
  const initContainerStatuses = statusesToRecord(pod?.status?.initContainerStatuses)
  const containers = pod.spec.containers || []
  const initContainers = pod.spec.initContainers || []

  return (
    <ScrollablePage heading="Info">
      <Flex
        direction="column"
        gap="xlarge"
      >
        <section>
          <SubTitle>Containers</SubTitle>
          <ContainersList
            containers={containers}
            containerStatuses={containerStatuses}
            initContainers={initContainers}
            initContainerStatuses={initContainerStatuses}
            namespace={namespace}
            podName={name}
          />
        </section>
        <section>
          <SubTitle>Metadata</SubTitle>
          <PodMetadata pod={pod} />
        </section>
      </Flex>
    </ScrollablePage>
  )
}
