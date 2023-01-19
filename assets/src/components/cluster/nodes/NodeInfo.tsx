import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { useParams } from 'react-router-dom'

import { ArcElement, Chart } from 'chart.js'
import { Card, LoopingLogo } from '@pluralsh/design-system'
import { Flex } from 'honorable'

import {
  Event,
  NodeMetric,
  Node as NodeT,
  Pod,
} from 'generated/graphql'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { POLL_INTERVAL } from '../constants'
import {
  ColActions,
  ColContainers,
  ColCpuReservation,
  ColMemoryReservation,
  ColNameLink,
  ColRestarts,
  PodsList,
} from '../pods/PodsList'
import { NODE_Q } from '../queries'
import { Metadata } from '../Metadata'

import { NodeGraphs } from './NodeGraphs'
import { SubTitle } from './SubTitle'

/*
Must explicitly import and register chart.js elements used in react-chartjs-2
*/
Chart.register(ArcElement)

export const podContainers = pods => pods
  .filter(({ status: { phase } }) => phase !== 'Succeeded')
  .map(({ spec: { containers } }) => containers)
  .flat()

export default function NodeInfo() {
  const { name } = useParams()

  const { data, refetch } = useQuery<{
    node: NodeT & {
      raw?: string
      pods?: Pod[]
      events?: Event[]
    }
    nodeMetric: NodeMetric
  }>(NODE_Q, {
    variables: { name },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const columns = useMemo(() => [
    ColNameLink,
    ColMemoryReservation,
    ColCpuReservation,
    ColRestarts,
    ColContainers,
    ColActions(refetch),
  ],
  [refetch])

  if (!data) return <LoopingLogo />

  const { node, nodeMetric } = data

  return (
    <ScrollablePage heading="Info">
      <Flex
        direction="column"
        gap="xlarge"
      >
        <section>
          <SubTitle>Pods</SubTitle>
          <PodsList
            columns={columns}
            pods={node.pods}
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
        </section>
      </Flex>
    </ScrollablePage>
  )
}
