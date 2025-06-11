import { EmptyState, Table, Tooltip } from '@pluralsh/design-system'
import { ColumnDef, createColumnHelper, Row } from '@tanstack/react-table'
import { filesize } from 'filesize'
import {
  ClusterFragment,
  ClusterNodeFragment,
  Node,
  NodeMetric,
  NodeMetricFragment,
  useClusterNodesQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { getResourceDetailsAbsPath } from 'routes/kubernetesRoutesConsts.tsx'
import { cpuParser, memoryParser } from '../../../utils/kubernetes.ts'
import { rounded } from '../../../utils/number.ts'
import {
  nodeStatusToReadiness,
  ReadinessT,
  readinessToLabel,
} from '../../../utils/status.ts'
import { POLL_INTERVAL } from '../../cluster/constants.ts'
import { mapify } from '../../cluster/LabelsAnnotations.tsx'
import {
  numishSort,
  StatusChip,
  TableCaretLink,
  TableText,
  UsageText,
} from '../../cluster/TableElements'
import LoadingIndicator from '../../utils/LoadingIndicator.tsx'
import { UsageBar } from '../../utils/UsageBar.tsx'

export default function ClusterNodes() {
  const theme = useTheme()
  const { cluster } = useOutletContext() as { cluster: ClusterFragment }

  const { data } = useClusterNodesQuery({
    variables: { id: cluster.id || '' },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const columns: ColumnDef<TableData, any>[] = useMemo(
    () => [
      ColName,
      ColRegion,
      ColZone,
      ColCpuUsage,
      ColMemoryUsage,
      ColCpuTotal,
      ColMemoryTotal,
      ColStatus,
      ColActions(cluster?.id),
    ],
    [cluster]
  )

  if (!data) return <LoadingIndicator />

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
        overflow: 'hidden',
        height: '100%',
      }}
    >
      <NodesList
        nodes={data?.cluster?.nodes || []}
        nodeMetrics={data?.cluster?.nodeMetrics || []}
        columns={columns}
        clusterId={cluster?.id}
      />
    </div>
  )
}

type Capacity = { memory?: string; cpu?: string }

export type TableData = {
  name: string
  memory: {
    used?: number
    total?: any
  }
  cpu: {
    used?: number
    total?: number
  }
  region?: any
  zone?: any
  readiness: ReadinessT
}

export const columnHelper = createColumnHelper<TableData>()

const zoneKey = 'failure-domain.beta.kubernetes.io/zone'
const regionKey = 'failure-domain.beta.kubernetes.io/region'

export const ColName = columnHelper.accessor((row) => row.name, {
  id: 'name',
  enableSorting: true,
  cell: (props) => (
    <Tooltip
      label={props.getValue()}
      placement="top"
    >
      <TableText> {props.getValue()} </TableText>
    </Tooltip>
  ),
  header: 'Name',
  maxSize: 30,
  meta: { truncate: true },
})

export const ColRegion = columnHelper.accessor((row) => row.region, {
  id: 'region',
  enableSorting: true,
  cell: ({ getValue }) => <TableText>{getValue()}</TableText>,
  header: 'Region',
})

export const ColZone = columnHelper.accessor((row) => row.zone, {
  id: 'zone',
  enableSorting: true,
  cell: ({ getValue }) => <TableText>{getValue()}</TableText>,
  header: 'Zone',
})

export const ColCpuUsage = columnHelper.accessor(
  (row) => (row?.cpu?.used ?? 0) / (row?.cpu?.total ?? 1),
  {
    id: 'cpu-usage',
    enableSorting: true,
    sortingFn: numishSort,
    cell: (props) => (
      <Tooltip
        label={`${rounded(props.getValue())}%`}
        placement="top"
      >
        <TableText>
          <UsageBar
            usage={props.getValue()}
            width={120}
          />
        </TableText>
      </Tooltip>
    ),
    header: 'CPU usage',
  }
)

export const ColMemoryUsage = columnHelper.accessor(
  (row) => (row?.memory?.used ?? 0) / (row?.memory?.total ?? 1),
  {
    id: 'memory-usage',
    enableSorting: true,
    sortingFn: numishSort,
    cell: (props) => (
      <Tooltip
        label={`${rounded(props.getValue())}%`}
        placement="top"
      >
        <TableText>
          <UsageBar
            usage={props.getValue()}
            width={120}
          />
        </TableText>
      </Tooltip>
    ),
    header: 'Memory usage',
  }
)

export const ColCpuTotal = columnHelper.accessor(
  (row) => row?.cpu?.total ?? 0,
  {
    id: 'cpu-total',
    enableSorting: true,
    sortingFn: numishSort,
    cell: (props) => <UsageText>{props.getValue()}</UsageText>,
    header: 'CPU',
  }
)

export const ColMemoryTotal = columnHelper.accessor(
  (row) => row?.memory?.total ?? 0,
  {
    id: 'memory-total',
    enableSorting: true,
    sortingFn: numishSort,
    cell: (props: any) => (
      <UsageText>{filesize(props.getValue())?.toString()}</UsageText>
    ),
    header: 'Memory',
  }
)

export const ColStatus = columnHelper.accessor(
  (row) => (row?.readiness ? readinessToLabel[row.readiness] : ''),
  {
    id: 'status',
    enableSorting: true,
    cell: ({ row: { original } }) => (
      <div>
        <StatusChip readiness={original.readiness} />
      </div>
    ),
    header: 'Status',
  }
)

export const ColActions = (clusterId?: string) =>
  columnHelper.accessor(() => null, {
    id: 'actions',
    cell: ({ row: { original } }) => (
      <TableCaretLink
        to={getResourceDetailsAbsPath(clusterId, 'node', original?.name)}
        textValue={`View node ${original?.name}`}
      />
    ),
    header: '',
  })

function NodesList({
  nodes,
  nodeMetrics,
  columns,
  clusterId,
}: {
  nodes: (ClusterNodeFragment | null)[]
  nodeMetrics: (NodeMetricFragment | null)[]
  columns: ColumnDef<TableData, any>[]
  clusterId?: string
}) {
  const navigate = useNavigate()
  const metrics: Record<string, { cpu?: number; memory?: number }> =
    useMemo(() => {
      if (!nodeMetrics) {
        return {}
      }

      return nodeMetrics
        .filter((metric): metric is NodeMetric => !!metric)
        .reduce(
          (prev, { metadata: { name }, usage }) => ({
            ...prev,
            [name]: {
              cpu: cpuParser(usage?.cpu ?? ''),
              memory: memoryParser(usage?.memory ?? ''),
            },
          }),
          {}
        )
    }, [nodeMetrics])

  const tableData: TableData[] = useMemo(
    () =>
      (nodes || [])
        .filter((node): node is Node => !!node)
        .map((node) => {
          const thisMetrics = metrics[node.metadata.name]
          const labelsMap = mapify(node?.metadata.labels)
          const capacity: Capacity = (node?.status?.capacity as Capacity) ?? {}

          return {
            name: node?.metadata?.name,
            memory: {
              used: thisMetrics?.memory,
              total: memoryParser(capacity?.memory),
            },
            cpu: {
              used: thisMetrics?.cpu,
              total: cpuParser(capacity?.cpu),
            },
            region: labelsMap[regionKey],
            zone: labelsMap[zoneKey],
            readiness: nodeStatusToReadiness(node.status),
          }
        }),
    [metrics, nodes]
  )

  if (!tableData || tableData.length === 0) {
    return <EmptyState message="No nodes available." />
  }

  return (
    <Table
      loose
      fullHeightWrap
      data={tableData}
      columns={columns}
      onRowClick={(_e, { original }: Row<TableData>) =>
        navigate(getResourceDetailsAbsPath(clusterId, 'node', original?.name))
      }
    />
  )
}
