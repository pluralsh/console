import { Button, Chip, KubernetesIcon, Table } from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { DrainNodeModal } from 'components/kubernetes/common/DrainNodeModal'
import {
  ClusterOverviewDetailsFragment,
  NodeStatistic,
  NodeStatisticFragment,
  NodeStatisticHealth,
} from 'generated/graphql'
import { capitalize, isEmpty } from 'lodash'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getClusterAbsPath,
  getResourceDetailsAbsPath,
  NODES_REL_PATH,
} from 'routes/kubernetesRoutesConsts'
import { HealthScoreSection, IssuesEmptyState } from './HealthScoreTab'

const columnHelper = createColumnHelper<NodeStatisticFragment>()

export function InfrastructureIssuesSection({
  cluster,
}: {
  cluster: ClusterOverviewDetailsFragment
}) {
  const navigate = useNavigate()
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
          to={`${getClusterAbsPath(cluster?.id)}/${NODES_REL_PATH}`}
          startIcon={<KubernetesIcon />}
        >
          View all nodes
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
          virtualizeRows
          fullHeightWrap
          rowBg="raised"
          data={infrastructureIssues}
          columns={columns}
          onRowClick={(_e, { original }: Row<NodeStatisticFragment>) =>
            navigate(
              getResourceDetailsAbsPath(cluster.id, 'node', original?.name)
            )
          }
        />
      )}
    </HealthScoreSection>
  )
}

const columns = [
  columnHelper.accessor('name', {
    id: 'name',
    header: 'Node name',
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
