import { useContext, useEffect, useMemo } from 'react'
import { useQuery } from 'react-apollo'
import { memoryParser } from 'kubernetes-resource-parser'
import { sumBy } from 'lodash'
import { Chip, ProgressBar, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import produce from 'immer'
import { filesize } from 'filesize'
import styled, { useTheme } from 'styled-components'
import { Link } from 'react-router-dom'

import {
  ReadinessT,
  nodeStatusToReadiness,
  readinessToChipTitle,
  readinessToSeverity,
} from 'utils/status'

import { mapify } from '../Metadata'
import { cpuParser } from '../../../utils/kubernetes'
import { LoopingLogo } from '../../utils/AnimatedLogo'
import { BreadcrumbsContext } from '../../Breadcrumbs'
import { POLL_INTERVAL } from '../constants'
import { NODES_Q } from '../queries'

import { ClusterMetrics } from './ClusterMetrics'

function UsageBarUnstyled({ usage, ...props }: { usage: number }) {
  const theme = useTheme()
  const color
    = usage > 0.9
      ? theme.colors['border-danger']
      : usage > 0.75
        ? theme.colors['border-warning']
        : theme.colors['text-xlight']

  return (
    <ProgressBar
      mode="determinate"
      progress={usage}
      progressColor={color}
      completeColor={color}
      {...props}
    />
  )
}
const UsageBar = styled(UsageBarUnstyled)(({ theme }) => ({
  marginTop: theme.spacing.xxsmall,
}))

const TableText = styled.div(({ theme }) => ({
  ...theme.partials.text.body2LooseLineHeight,
  color: theme.colors['text-light'],
}))
const CaptionText = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
}))
const StatusChip = styled(({ readiness }: { readiness: ReadinessT }) => (
  <Chip severity={readinessToSeverity[readiness]}>
    {readinessToChipTitle[readiness]}
  </Chip>
))(_ => ({}))

const columnHelper = createColumnHelper<any>()

const zoneKey = 'failure-domain.beta.kubernetes.io/zone'
const regionKey = 'failure-domain.beta.kubernetes.io/region'
const columns = [
  columnHelper.accessor(row => row.metadata?.name, {
    id: 'name',
    cell: (props: any) => (
      <Link to={`/nodes/${props.row.original.metadata.name}`}>
        {props.getValue()}
      </Link>
    ),
    header: 'Name',
  }),
  columnHelper.accessor(row => `${row.metadata.labelsMap[regionKey]} - ${row.metadata.labelsMap[zoneKey]}`,
    {
      id: 'region-zone',
      cell: ({ row: { original } }: any) => (
        <>
          <TableText>{original.metadata.labelsMap[regionKey]}</TableText>
          <CaptionText>{original.metadata.labelsMap[zoneKey]}</CaptionText>
        </>
      ),
      header: 'Region/Zone',
    }),
  columnHelper.accessor(row => (row?.metrics?.memory ?? 0) / (row?.status?.capacity?.memoryBytes ?? 1),
    {
      id: 'memory-usage',
      cell: ({ row: { original }, ...props }: any) => (
        <>
          <TableText>
            {original?.metrics?.memoryFilesize} /{' '}
            {original?.status?.capacity?.memoryFilesize}
          </TableText>
          <UsageBar usage={props.getValue()} />
        </>
      ),
      header: 'Memory usage',
    }),
  columnHelper.accessor(row => (row?.metrics?.cpu ?? 0) / (row?.status?.capacity?.cpuParsed ?? 1),
    {
      id: 'cpu-usage',
      cell: ({ row: { original }, ...props }: any) => (
        <>
          <TableText>
            {Math.round((original?.metrics?.cpu || 0) * 100) / 100} /{' '}
            {original?.status?.capacity?.cpuParsed} cores
          </TableText>
          <UsageBar usage={props.getValue()} />
        </>
      ),
      header: 'Memory usage',
    }),
  columnHelper.accessor(row => readinessToChipTitle[nodeStatusToReadiness(row?.status)],
    {
      id: 'status',
      cell: ({ row: { original } }: any) => (
        <StatusChip readiness={nodeStatusToReadiness(original?.status)} />
      ),
      header: 'Status',
    }),
]

export function Nodes() {
  const { data, refetch: _refetch } = useQuery(NODES_Q, {
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })
  const { setBreadcrumbs } = useContext(BreadcrumbsContext)

  useEffect(() => {
    setBreadcrumbs([{ text: 'nodes', url: '/nodes' }])
  }, [setBreadcrumbs])

  const metrics = useMemo(() => {
    if (!data) {
      return {}
    }

    return data.nodeMetrics.reduce((prev, { metadata: { name }, usage }) => ({
      ...prev,
      [name]: {
        cpu: cpuParser(usage.cpu),
        memory: memoryParser(usage.memory),
      },
    }),
    {})
  }, [data])

  const usage = useMemo(() => {
    if (!data) {
      return null
    }

    const cpu = sumBy(data.nodeMetrics, metrics => (cpuParser((metrics as any)?.usage?.cpu) ?? 0))
    const mem = sumBy(data.nodeMetrics, metrics => (memoryParser((metrics as any)?.usage?.memory) ?? 0))

    return { cpu, mem }
  }, [data])

  const tableData = useMemo(() => (data?.nodes || []).map(node => produce(node, draft => {
    draft.metadata.labelsMap = mapify(draft.metadata.labels)
    draft.status.capacity.memoryBytes = memoryParser(node?.status?.capacity?.memory)
    draft.status.capacity.cpuParsed = cpuParser(node?.status?.capacity?.cpu)
    draft.status.capacity.memoryFilesize = filesize(draft.status.capacity.memoryBytes)
    draft.metrics = metrics[draft.metadata.name] || {}
    draft.metrics.memoryFilesize = filesize(draft.metrics.memory)
    console.log('draft.metrics', draft.metrics)
    console.log('draft.status', draft.status)
  })),
  [data?.nodes, metrics])

  console.log('tableData', tableData)
  if (!data) {
    return <LoopingLogo dark />
  }
  console.log('data', data)

  return (
    <div>
      <ClusterMetrics
        nodes={data.nodes}
        usage={usage}
      />
      <Table
        data={tableData}
        columns={columns}
        // onScrollCapture={e => fetchMoreOnBottomReached(e?.target)}
        maxHeight="calc(100vh - 244px)"
      />
    </div>
  )
}

// {
//   data.nodes.map((node, ind) => (
//     <NodeRow
//       key={ind}
//       node={node}
//       metrics={metrics}
//       refetch={refetch}
//     />
//   ))
// }
