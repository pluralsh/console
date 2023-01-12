import { Sidecar, SidecarItem } from '@pluralsh/design-system'
import { Node, NodeMetric, Pod } from 'generated/graphql'
import { useQuery } from '@apollo/client'
import { useParams } from 'react-router-dom'
import { nodeStatusToReadiness } from 'utils/status'

import { POLL_INTERVAL } from '../constants'
import { NODE_Q } from '../queries'

import { StatusChip } from '../TableElements'

export default function NodeSidecar() {
  const { name } = useParams()
  const { data } = useQuery<{
    node: Node & {
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

  if (!data) {
    return null
  }
  const { node } = data
  const readiness = nodeStatusToReadiness(node?.status)

  return (
    <Sidecar heading="Metadata">
      <SidecarItem heading="Name">{node.metadata.name}</SidecarItem>
      <SidecarItem heading="Status"><StatusChip readiness={readiness} /></SidecarItem>
    </Sidecar>
  )
}
