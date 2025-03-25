import { GqlError } from 'components/utils/Alert'
import { useFlowMcpServersQuery, useMcpServersQuery } from 'generated/graphql'
import { useParams } from 'react-router-dom'

export function FlowMcpConnections() {
  const { flowId } = useParams()
  const { data, loading, error } = useFlowMcpServersQuery({
    variables: { id: flowId ?? '' },
  })
  const test = useMcpServersQuery()

  if (error) return <GqlError error={error} />
  console.log(data, { test })
  return <div>FlowMcpConnections</div>
}
