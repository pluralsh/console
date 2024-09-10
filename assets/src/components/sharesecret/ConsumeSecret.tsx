import { useParams } from 'react-router-dom'

export default function ConsumeSecret() {
  const { handle } = useParams()

  return <>consume-secret {handle}</>
}
