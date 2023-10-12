import { useOutletContext } from 'react-router-dom'

import { Cluster } from '../../../generated/graphql'

export default function ClusterNodes() {
  const { cluster } = useOutletContext() as {
    cluster: Cluster
  }

  console.log(cluster?.nodes)

  return <>Nodes of {cluster?.name} cluster</>
}
