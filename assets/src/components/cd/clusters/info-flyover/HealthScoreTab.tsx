import { ClustersRowFragment } from 'generated/graphql.ts'

export function HealthScoreTab({ cluster }: { cluster: ClustersRowFragment }) {
  console.log('cluster', cluster)
  return <div>HealthScoreTab</div>
}
