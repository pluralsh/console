import { useParams } from 'react-router-dom'

import { Logs } from '../logs/Logs'

export default function ClusterLogs() {
  const { clusterId } = useParams()

  return <Logs clusterId={clusterId} />
}
