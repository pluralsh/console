import { useOutletContext } from 'react-router-dom'

import { Cluster } from '../../../generated/graphql'
import { NodesList } from '../../cluster/nodes/NodesList'

export default function ClusterNodes() {
  const { cluster } = useOutletContext() as { cluster: Cluster }

  return (
    <NodesList
      nodes={cluster?.nodes || []}
      nodeMetrics={cluster?.nodeMetrics || []}
      refetch={undefined}
    />
  )
}
