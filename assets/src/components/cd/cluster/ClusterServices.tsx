import { useParams } from 'react-router-dom'

import { ServicesTable } from '../services/ServicesTable'

export default function ClusterServices() {
  const { clusterId } = useParams()

  return <ServicesTable clusterId={clusterId} />
}
