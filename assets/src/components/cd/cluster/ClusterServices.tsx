import { useParams } from 'react-router-dom'

import { ServicesTable } from '../services/ServicesTable'

import { useClusterContext } from './Cluster'

export default function ClusterServices() {
  const { clusterId } = useParams()
  const { setRefetchServices } = useClusterContext()

  return (
    <ServicesTable
      clusterId={clusterId}
      setRefetch={setRefetchServices}
    />
  )
}
