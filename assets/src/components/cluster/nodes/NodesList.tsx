import { useMemo, useState } from 'react'
import { filesize } from 'filesize'
import { A, Flex } from 'honorable'
import { IconFrame, Tooltip, TrashCanIcon } from '@pluralsh/design-system'
import { Link } from 'react-router-dom'
import { createColumnHelper } from '@tanstack/react-table'

import { Node, NodeMetric } from 'generated/graphql'
import { ReadinessT, nodeStatusToReadiness, readinessToLabel } from 'utils/status'
import { cpuParser, memoryParser } from 'utils/kubernetes'

import { Confirm } from 'components/utils/Confirm'

import { useMutation } from 'react-apollo'

import { mapify } from '../Metadata'
import {
  CaptionText,
  GridTable,
  StatusChip,
  TABLE_HEIGHT,
  TableCaretLink,
  TableText,
  Usage,
} from '../TableElements'

import { DELETE_NODE } from '../queries'

import { UsageBar } from './UsageBar'

type Capacity = { memory?: string; cpu?: string }

type TableData = {
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

const columnHelper = createColumnHelper<TableData>()

const zoneKey = 'failure-domain.beta.kubernetes.io/zone'
const regionKey = 'failure-domain.beta.kubernetes.io/region'

function DeleteNode({ name, refetch }) {
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading }] = useMutation(DELETE_NODE, {
    variables: { name },
    onCompleted: () => {
      setConfirm(false)
      refetch()
    },
  })

  return (
    <>
      <IconFrame
        clickable
        icon={<TrashCanIcon color="icon-danger" />}
        onClick={() => setConfirm(true)}
        textValue="Delete"
        tooltip
      />
      <Confirm
        close={() => {
          console.log('close')
          setConfirm(false)
        }}
        destructive
        label="Delete"
        loading={loading}
        open={confirm}
        submit={() => mutation()}
        title="Delete node"
        text={`The node "${name}" will be replaced within its autoscaling group.`}
      />
    </>
  )
}

const ColName = columnHelper.accessor(row => row.name, {
  id: 'name',
  cell: ({ row: { original }, ...props }) => (
    <Tooltip
      label={props.getValue()}
      placement="top"
    >
      <TableText>
        <A
          inline
          display="inline"
          as={Link}
          to={`/nodes/${original.name}`}
        >
          {props.getValue()}
        </A>
      </TableText>
    </Tooltip>
  ),
  header: 'Name',
  maxSize: 30,
  enableResizing: true,
})

const ColRegionZone = columnHelper.accessor(row => `${row.zone} - ${row.zone}`,
  {
    id: 'region-zone',
    cell: ({ row: { original } }) => (
      <>
        <TableText>{original.zone}</TableText>
        <CaptionText>{original.zone}</CaptionText>
      </>
    ),
    header: 'Region/Zone',
  })

const ColMemory = columnHelper.accessor(row => (row?.memory?.used ?? 0) / (row?.memory?.total ?? 1),
  {
    id: 'memory-usage',
    cell: ({ row: { original }, ...props }) => (
      <>
        <Usage
          used={filesize(original?.memory?.used ?? 0)}
          total={filesize(original?.memory?.total ?? 0)}
        />
        <UsageBar usage={props.getValue()} />
      </>
    ),
    header: 'Memory usage',
  })

const ColCpu = columnHelper.accessor(row => (row?.cpu.used ?? 0) / (row?.cpu.total ?? 1),
  {
    id: 'cpu-usage',
    cell: ({ row: { original }, ...props }: any) => (
      <>
        <Usage
          used={Math.round((original?.cpu?.used || 0) * 100) / 100}
          total={original?.cpu?.total}
        />
        <UsageBar usage={props.getValue()} />
      </>
    ),
    header: 'Memory usage',
  })

const ColStatus = columnHelper.accessor(row => (row?.readiness ? readinessToLabel[row.readiness] : ''),
  {
    id: 'status',
    cell: ({ row: { original } }) => (
      <StatusChip readiness={original.readiness} />
    ),
    header: 'Status',
  })

const ColActions = refetch => columnHelper.accessor(row => row.name, {
  id: 'actions',
  cell: ({ row: { original } }) => (
    <Flex
      flexDirection="row"
      gap="xxsmall"
    >
      <DeleteNode
        name={original.name}
        refetch={refetch}
      />
      <TableCaretLink
        to={`/nodes/${original.name}`}
        textValue={`View node ${original?.name}`}
      />
    </Flex>
  ),
  header: '',
})

export function NodesList({
  nodes,
  nodeMetrics,
  refetch,
}: {
  nodes: Node[]
  nodeMetrics: NodeMetric[]
  refetch: any
}) {
  const metrics: Record<string, { cpu?: number; memory?: number }>
    = useMemo(() => {
      if (!nodeMetrics) {
        return {}
      }

      return nodeMetrics.reduce((prev, { metadata: { name }, usage }) => ({
        ...prev,
        [name]: {
          cpu: cpuParser(usage?.cpu ?? ''),
          memory: memoryParser(usage?.memory ?? ''),
        },
      }),
      {})
    }, [nodeMetrics])

  const tableData: TableData[] = useMemo(() => (nodes || []).map(node => {
    const thisMetrics = metrics[node.metadata.name]
    const labelsMap = mapify(node.metadata.labels)
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
      readiness: nodeStatusToReadiness(node?.status),
    }
  }),
  [metrics, nodes])

  // Memoize columns to prevent rerendering entire table
  const columns = useMemo(() => [
    ColName,
    ColRegionZone,
    ColMemory,
    ColCpu,
    ColStatus,
    ColActions(refetch),
  ], [refetch])

  if (!tableData || tableData.length === 0) {
    return <>No nodes available.</>
  }

  return (
    <GridTable
      data={tableData}
      columns={columns}
      $truncColIndexes={[0]}
      {...TABLE_HEIGHT}
    />
  )
}
