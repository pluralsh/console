import { Button, Chip, PrOpenIcon, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import {
  ClusterOverviewDetailsFragment,
  NodeStatistic,
  NodeStatisticFragment,
  NodeStatisticHealth,
} from 'generated/graphql'
import { capitalize, isEmpty } from 'lodash'
import { Link } from 'react-router-dom'
import {
  CLUSTER_DETAILS_PATH,
  CLUSTER_NODES_PATH,
  getClusterDetailsPath,
} from 'routes/cdRoutesConsts'
import { HealthScoreSection, IssuesEmptyState } from './HealthScoreTab'
import { DrainNodeModal } from 'components/kubernetes/common/DrainNodeModal'
import { useState } from 'react'

const columnHelper = createColumnHelper<NodeStatisticFragment>()

export function InfrastructureIssuesSection({
  cluster,
}: {
  cluster: ClusterOverviewDetailsFragment
}) {
  const infrastructureIssues =
    cluster.nodeStatistics?.filter(
      (node): node is NodeStatistic =>
        !!node && node.health !== NodeStatisticHealth.Healthy
    ) ?? []
  return (
    <HealthScoreSection
      title={`Infrastructure issues (${infrastructureIssues.length})`}
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
      {isEmpty(infrastructureIssues) ? (
        <IssuesEmptyState
          name={cluster.name}
          type="infrastructure"
        />
      ) : (
        <Table
          data={infrastructureIssues}
          columns={columns}
        />
      )}
    </HealthScoreSection>
  )
}

const columns = [
  columnHelper.accessor('name', {
    id: 'name',
    header: 'Name',
    meta: { gridTemplate: '1fr' },
  }),
  columnHelper.accessor('health', {
    id: 'health',
    header: 'Health',
    meta: {
      tooltip:
        'This health indicator is calculated from pod status and should be used as a general reference.',
      tooltipProps: { placement: 'top', style: { maxWidth: 260 } },
    },
    cell: function Cell({ getValue }) {
      const health = getValue() ?? NodeStatisticHealth.Warning
      return (
        <Chip severity={healthToSeverity(health)}>{capitalize(health)}</Chip>
      )
    },
  }),
  columnHelper.accessor((node) => node, {
    id: 'pendingPods',
    header: 'Pending pods',
    cell: function Cell({ getValue }) {
      const { pendingPods, health } = getValue()
      return (
        <Chip
          severity={healthToSeverity(health ?? NodeStatisticHealth.Warning)}
          css={{ width: '100%', justifyContent: 'center' }}
        >
          {pendingPods ?? 0}
        </Chip>
      )
    },
  }),
  columnHelper.accessor((node) => node, {
    id: 'actions',
    header: '',
    cell: function Cell({ getValue }) {
      const { name, cluster } = getValue()
      const [modalOpen, setModalOpen] = useState(false)
      return (
        <>
          <Button
            small
            secondary
            onClick={() => setModalOpen(true)}
          >
            Drain node
          </Button>
          <DrainNodeModal
            name={name}
            open={modalOpen}
            setOpen={setModalOpen}
            clusterId={cluster?.id}
          />
        </>
      )
    },
  }),
]

const healthToSeverity = (health: NodeStatisticHealth) => {
  switch (health) {
    case NodeStatisticHealth.Failed:
      return 'danger'
    case NodeStatisticHealth.Warning:
      return 'warning'
    case NodeStatisticHealth.Healthy:
      return 'success'
  }
}
