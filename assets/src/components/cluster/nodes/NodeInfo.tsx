import { useQuery } from '@apollo/client'
import { useParams } from 'react-router-dom'
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
} from '../../cd/cluster/pod/PodsList'
import { NODE_Q } from '../queries'
import { SubTitle } from '../../utils/SubTitle'

import { NodeGraphs } from './NodeGraphs'

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

  const { node } = data

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xlarge,
      }}
    >
      <NodeGraphs
        name={name}
        node={node}
      />
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
