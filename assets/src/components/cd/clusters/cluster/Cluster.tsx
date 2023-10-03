import { useParams } from 'react-router-dom'

export default function Cluster() {
  const { clusterId } = useParams()

  return <>Cluster {clusterId}</>
}
