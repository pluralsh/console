import { useSentinelSuspenseQuery } from 'generated/graphql'
import { useParams } from 'react-router-dom'

export function AISentinel() {
  const { id } = useParams()
  const { data, error, loading } = useSentinelSuspenseQuery({
    variables: { id },
  })
  return <div>AiSentinel</div>
}
