import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { useParams } from 'react-router-dom'

import { Card } from '@pluralsh/design-system'
import { Flex } from 'honorable'

import { Event, NodeMetric, Node as NodeT, Pod } from 'generated/graphql'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { SubTitle } from '../../../cluster/nodes/SubTitle'
import { NodeGraphs } from '../../../cluster/nodes/NodeGraphs'
import {
  ColActions,
  ColContainers,
  ColCpuReservation,
  ColMemoryReservation,
  ColName,
  ColRestarts,
  PodsList,
} from '../../../cluster/pods/PodsList'
import { NODE_Q } from '../../../cluster/queries'
import { POLL_INTERVAL } from '../../../cluster/constants'

export const podContainers = (pods) =>
  pods
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

  const columns = useMemo(
    () => [
      ColName,
      ColMemoryReservation,
      ColCpuReservation,
      ColRestarts,
      ColContainers,
      ColActions(refetch),
    ],
    [refetch]
  )

  if (!data) return <LoadingIndicator />

  const { node, nodeMetric } = data

  return (
    <Flex
      direction="column"
      gap="xlarge"
    >
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
        <SubTitle>Pods</SubTitle>
        <PodsList
          columns={columns}
          pods={node.pods}
        />
      </section>
    </Flex>
  )
}
