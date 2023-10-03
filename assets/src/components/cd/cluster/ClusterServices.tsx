import { useParams } from 'react-router-dom'

export default function ClusterServices() {
  const { clusterId } = useParams()

  return <>Services of {clusterId} cluster</>
}
