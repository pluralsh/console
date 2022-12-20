import { useContext, useEffect, useMemo } from 'react'
import { useQuery } from 'react-apollo'
import { memoryParser } from 'kubernetes-resource-parser'
import { sumBy } from 'lodash'
import {
  Chip,
  ProgressBar,
  Table,
  styledTheme as theme,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import produce from 'immer'
import { filesize } from 'filesize'

import { Link } from 'react-router-dom'

import { readinessToChipTitle } from 'utils/status'

import { mapify } from '../Metadata'
import { cpuParser } from '../../../utils/kubernetes'
import { LoopingLogo } from '../../utils/AnimatedLogo'
import { BreadcrumbsContext } from '../../Breadcrumbs'
import { POLL_INTERVAL } from '../constants'
import { NODES_Q } from '../queries'

import { ClusterMetrics } from './ClusterMetrics'
import { nodeReadiness } from './Node'

const columnHelper = createColumnHelper<any>()

const zoneKey = 'failure-domain.beta.kubernetes.io/zone'
const regionKey = 'failure-domain.beta.kubernetes.io/region'
const columns = [
  columnHelper.accessor(row => row.metadata?.name, {
    id: 'name',
    cell: (props: any) => (
      <Link to={`/nodes/${props.row.original.metadata.name}`}>{props.getValue()}</Link>
    ),
    header: 'Name',
  }),
  columnHelper.accessor(row => `${row.metadata.labelsMap[regionKey]} - ${row.metadata.labelsMap[zoneKey]}`,
    {
      id: 'region-zone',
      cell: ({ row: { original } }: any) => (
        <div>
          <div>{original.metadata.labelsMap[regionKey]}</div>
          <div>{original.metadata.labelsMap[zoneKey]}</div>
        </div>
      ),
      header: 'Region/Zone',
    }),
  columnHelper.accessor(row => (row?.metrics?.memory ?? 0)
  / (row?.status?.capacity?.memoryBytes ?? 1), {
    id: 'memory-usage',
    cell: ({ row: { original }, ...props }: any) => (
      <div>
        <div>
          <div>
            {original?.metrics?.memoryFilesize} /{' '}
            {original?.status?.capacity?.memoryFilesize}
          </div>
        </div>
        <ProgressBar
          mode="determinate"
          progress={props.getValue()}
          progressColor={theme.colors['text-xlight']}
          completeColor={theme.colors['text-xlight']}
        />
      </div>
    ),
    header: 'Memory usage',
  }),
  columnHelper.accessor(row => (row?.metrics?.cpu ?? 0)
  / (row?.status?.capacity?.cpuParsed ?? 1), {
    id: 'cpu-usage',
    cell: ({ row: { original }, ...props }: any) => (
      <div>
        <div>
          <div>
            {Math.round((original?.metrics?.cpu || 0) * 100) / 100} /{' '}
            {original?.status?.capacity?.cpuParsed} cores
          </div>
        </div>
        <ProgressBar
          mode="determinate"
          progress={props.getValue()}
          progressColor={theme.colors['text-xlight']}
          completeColor={theme.colors['text-xlight']}
        />
      </div>
    ),
    header: 'Memory usage',
  }),
  columnHelper.accessor(row => readinessToChipTitle[nodeReadiness(row?.status)], {
    id: 'status',
    cell: (props: any) => (
      <Chip color="blue">{props.getValue()}</Chip>
    ),
    header: 'Status',
  }),
]

export function Nodes() {
  const { data, refetch } = useQuery(NODES_Q, {
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

    const cpu = sumBy(data.nodeMetrics, ({ usage: { cpu } }) => cpuParser(cpu))
    const mem = sumBy(data.nodeMetrics, ({ usage: { memory } }) => memoryParser(memory))

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
