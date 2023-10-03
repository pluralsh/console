import { useParams } from 'react-router-dom'

export default function ClusterPods() {
  const { clusterId } = useParams()

  return <>Pods of {clusterId} cluster</>
}
