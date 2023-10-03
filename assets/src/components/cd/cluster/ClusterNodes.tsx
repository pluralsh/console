import { useParams } from 'react-router-dom'

export default function ClusterNodes() {
  const { clusterId } = useParams()

  return <>Nodes of {clusterId} cluster</>
}
