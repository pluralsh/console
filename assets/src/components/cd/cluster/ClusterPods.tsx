import { useOutletContext } from 'react-router-dom'

import { ClustersRowFragment } from '../../../generated/graphql'

export default function ClusterPods() {
  const { cluster } = useOutletContext() as {
    cluster: ClustersRowFragment
  }

  return <>Pods of {cluster?.name} cluster</>
}
