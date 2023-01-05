import { useMemo } from 'react'
import { useQuery } from 'react-apollo'
import { sumBy } from 'lodash'
import { createColumnHelper } from '@tanstack/react-table'

import { filesize } from 'filesize'
import { A, Flex } from 'honorable'
import { Card, Tooltip } from '@pluralsh/design-system'
import { Link } from 'react-router-dom'
import { ScrollablePage } from 'components/layout/ScrollablePage'

import type { Node, NodeMetric } from 'generated/graphql'
import { ReadinessT, nodeStatusToReadiness, readinessToChipTitle } from 'utils/status'
import { cpuParser, memoryParser } from 'utils/kubernetes'
import { LoopingLogo } from 'components/utils/AnimatedLogo'

import { mapify } from '../Metadata'
import { POLL_INTERVAL } from '../constants'
import { NODES_Q } from '../queries'

import {
  CaptionText,
  GridTable,
  StatusChip,
  TABLE_HEIGHT,
  TableCaretLink,
  TableText,
  Usage,
} from '../TableElements'

import { ClusterMetrics } from './ClusterMetrics'
import { UsageBar } from './UsageBar'

type Capacity = { memory?: string; cpu?: string }

const columnHelper = createColumnHelper<TableData>()

const zoneKey = 'failure-domain.beta.kubernetes.io/zone'
const regionKey = 'failure-domain.beta.kubernetes.io/region'
const columns = [
  columnHelper.accessor(row => row.name, {
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
  }),
  columnHelper.accessor(row => `${row.zone} - ${row.zone}`, {
    id: 'region-zone',
    cell: ({ row: { original } }) => (
      <>
        <TableText>{original.zone}</TableText>
        <CaptionText>{original.zone}</CaptionText>
      </>
    ),
    header: 'Region/Zone',
  }),
  columnHelper.accessor(row => (row?.memory?.used ?? 0) / (row?.memory?.total ?? 1),
    {
      id: 'memory-usage',
      cell: ({ row: { original }, ...props }) => (
        <>
          <Usage
            used={filesize(original?.memory?.used)}
            total={filesize(original?.memory?.total)}
          />
          <UsageBar usage={props.getValue()} />
        </>
      ),
      header: 'Memory usage',
    }),
  columnHelper.accessor(row => (row?.cpu.used ?? 0) / (row?.cpu.total ?? 1), {
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
  }),
  columnHelper.accessor(row => (row?.readiness ? readinessToChipTitle[row.readiness] : ''),
    {
      id: 'status',
      cell: ({ row: { original } }: any) => (
        <StatusChip readiness={nodeStatusToReadiness(original?.status)} />
      ),
      header: 'Status',
    }),
  columnHelper.display({
    id: 'link',
    cell: ({ row: { original } }: any) => (
      <TableCaretLink
        to={`/nodes/${original.name}`}
        textValue={`View node ${original?.name}`}
      />
    ),
    header: '',
  }),
]

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
  readiness?: ReadinessT
}

export default function Nodes() {
  const { data } = useQuery<{
    nodes: Node[]
    nodeMetrics: NodeMetric[]
  }>(NODES_Q, {
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const metrics: Record<string, { cpu?: number; memory?: number }>
    = useMemo(() => {
      if (!data) {
        return {}
      }

      return data.nodeMetrics.reduce((prev, { metadata: { name }, usage }) => ({
        ...prev,
        [name]: {
          cpu: cpuParser(usage?.cpu ?? ''),
          memory: memoryParser(usage?.memory ?? ''),
        },
      }),
      {})
    }, [data])

  const usage = useMemo(() => {
    if (!data) {
      return null
    }
    const cpu = sumBy(data.nodeMetrics,
      metrics => cpuParser(metrics?.usage?.cpu) ?? 0)
    const mem = sumBy(data.nodeMetrics,
      metrics => memoryParser((metrics as any)?.usage?.memory) ?? 0)

    return { cpu, mem }
  }, [data])

  const tableData: TableData[] = useMemo(() => (data?.nodes || []).map(node => {
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
  [data?.nodes, metrics])

  if (!data) {
    return <LoopingLogo dark />
  }

  return (
    <ScrollablePage heading="Nodes">
      <Flex
        direction="column"
        gap="xlarge"
      >
        {tableData && tableData.length > 0 && (
          <GridTable
            data={tableData}
            columns={columns}
            $truncColIndex={0}
            {...TABLE_HEIGHT}
          />
        )}
        <Card padding="xlarge">
          <ClusterMetrics
            nodes={data.nodes}
            usage={usage}
          />
        </Card>
      </Flex>
    </ScrollablePage>
  )
}
