import { Button, PrOpenIcon } from '@pluralsh/design-system'
import { ClusterOverviewDetailsFragment } from 'generated/graphql'
import { Link } from 'react-router-dom'
import {
  CLUSTER_DETAILS_PATH,
  CLUSTER_NODES_PATH,
  getClusterDetailsPath,
} from 'routes/cdRoutesConsts'
import { isNonNullable } from 'utils/isNonNullable'
import { HealthScoreSection, IssuesEmptyState } from './HealthScoreTab'

export function ConfigurationIssuesSection({
  cluster,
}: {
  cluster: ClusterOverviewDetailsFragment
}) {
  const configurationIssues =
    cluster.insightComponents?.filter(isNonNullable) ?? []
  return (
    <HealthScoreSection
      title={`Configuration issues (${configurationIssues.length})`}
      actions={
        <Button
          small
          secondary
          as={Link}
          to={`${getClusterDetailsPath({ clusterId: cluster.id })}/${CLUSTER_DETAILS_PATH}/${CLUSTER_NODES_PATH}`}
          startIcon={<PrOpenIcon />}
        >
          View all nodes in CD
        </Button>
      }
    >
      <IssuesEmptyState
        name={cluster.name}
        type="configuration"
      />
    </HealthScoreSection>
  )
}
