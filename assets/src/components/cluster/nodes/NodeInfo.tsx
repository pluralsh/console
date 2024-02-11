import { useQuery } from '@apollo/client'
import { useParams } from 'react-router-dom'
import { Card } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { Event, NodeMetric, Node as NodeT, Pod } from 'generated/graphql'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { POLL_INTERVAL } from '../constants'
import {
  ColActions,
  ColContainers,
  ColCpuReservation,
  ColMemoryReservation,
  ColName,
  ColRestarts,
  PodsList,
} from '../pods/PodsList'
import { NODE_Q } from '../queries'

import { NodeGraphs } from './NodeGraphs'
import { SubTitle } from './SubTitle'

const columns = [
  ColName,
  ColMemoryReservation,
  ColCpuReservation,
  ColRestarts,
  ColContainers,
  ColActions,
]

export default function NodeInfo() {
  const theme = useTheme()
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

  if (!data) return <LoadingIndicator />

  const { node, nodeMetric } = data

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xlarge,
      }}
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
          refetch={refetch}
          columns={columns}
          pods={node.pods}
        />
      </section>
    </div>
  )
}
