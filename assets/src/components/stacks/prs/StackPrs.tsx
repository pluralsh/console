import { Card } from '@pluralsh/design-system'
import { useParams } from 'react-router-dom'

export function StackPrs() {
  const { stackId = '' } = useParams()

  return <Card>Stack Prs: {stackId}</Card>
}
