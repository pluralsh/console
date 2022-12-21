import {
  ComponentProps,
  useContext,
  useEffect,
  useMemo,
} from 'react'
import { useQuery } from 'react-apollo'
import { memoryParser } from 'kubernetes-resource-parser'
import { sumBy } from 'lodash'
import {
  CaretRightIcon,
  Chip,
  IconFrame,
  PageTitle,
  ProgressBar,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import styled, { useTheme } from 'styled-components'

import {
  ReadinessT,
  nodeStatusToReadiness,
  readinessToChipTitle,
  readinessToSeverity,
} from 'utils/status'

import { cpuParser } from 'utils/kubernetes'
import { LoopingLogo } from 'components/utils/AnimatedLogo'
import { UnstyledLink } from 'components/utils/Link'
import { BreadcrumbsContext } from 'components/Breadcrumbs'

import type { Node, NodeMetric } from 'generated/graphql'

import { filesize } from 'filesize'

import { mapify } from '../Metadata'
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
  '*:where(a) &': {
    '&:hover': {
      ...theme.partials.text.inlineLink,
    },
  },
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
const NameCell = styled.div(_ => ({
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
}))

const columnHelper = createColumnHelper<TableData>()

function TableCaretLinkUnstyled({
  textValue,
  ...props
}: ComponentProps<typeof UnstyledLink> & { textValue: string }) {
  const theme = useTheme()

  return (
    <UnstyledLink {...props}>
      <IconFrame
        clickable
        textValue={textValue}
        size="medium"
        icon={<CaretRightIcon />}
      />
    </UnstyledLink>
  )
}
const TableCaretLink = styled(TableCaretLinkUnstyled)(({ theme }) => ({
  'a&': {
    color: theme.colors['icon-default'],
  },
}))

const zoneKey = 'failure-domain.beta.kubernetes.io/zone'
const regionKey = 'failure-domain.beta.kubernetes.io/region'
const columns = [
  columnHelper.accessor(row => row.name, {
    id: 'name',
    cell: ({ row: { original }, ...props }) => (
      <NameCell>
        <UnstyledLink
          to={`/nodes/${original.name}`}
          $extendStyle={undefined}
        >
          <TableText>{props.getValue()}</TableText>
        </UnstyledLink>
      </NameCell>
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
          <TableText>
            <>
              {filesize(original?.memory?.used)} /{' '}
              {filesize(original?.memory?.total)}
            </>
          </TableText>
          <UsageBar usage={props.getValue()} />
        </>
      ),
      header: 'Memory usage',
    }),
  columnHelper.accessor(row => (row?.cpu.used ?? 0) / (row?.cpu.total ?? 1), {
    id: 'cpu-usage',
    cell: ({ row: { original }, ...props }: any) => (
      <>
        <TableText>
          {Math.round((original?.cpu?.used || 0) * 100) / 100} /{' '}
          {original?.cpu?.total} cores
        </TableText>
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
  const { setBreadcrumbs } = useContext(BreadcrumbsContext)

  useEffect(() => {
    setBreadcrumbs([{ text: 'nodes', url: '/nodes' }])
  }, [setBreadcrumbs])

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
      metrics => cpuParser((metrics as any)?.usage?.cpu) ?? 0)
    const mem = sumBy(data.nodeMetrics,
      metrics => memoryParser((metrics as any)?.usage?.memory) ?? 0)

    return { cpu, mem }
  }, [data])

  console.log({ usage, metrics })

  const tableData: TableData[] = useMemo(() => (data?.nodes || []).map(node => {
    const thisMetrics = metrics[node.metadata.name]
    const labelsMap = mapify(node.metadata.labels)

        type Capacity = { memory?: string; cpu?: string }
        const capacity: Capacity = (node?.status?.capacity as Capacity) ?? {}

        console.log({ node })
        console.log('nodeStatus', node.status)

        return {
          name: node?.metadata?.name,
          memory: {
            used: thisMetrics.memory,
            total: memoryParser(capacity?.memory ?? ''),
          },
          cpu: {
            used: thisMetrics.cpu,
            total: cpuParser(capacity?.cpu ?? ''),
          },
          region: labelsMap[regionKey],
          zone: labelsMap[zoneKey],
          readiness: nodeStatusToReadiness(node?.status),
        }
  }),
  [data?.nodes, metrics])

  console.log('tableData', tableData)
  if (!data) {
    return <LoopingLogo dark />
  }
  console.log('data', data)

  return (
    <>
      <PageTitle heading="Nodes" />
      <Table
        data={tableData}
        columns={columns}
        enableColumnResizing
        maxHeight="calc(100vh - 500px)"
      />
      <ClusterMetrics
        nodes={data.nodes}
        usage={usage}
      />
      <div>Some content</div>
    </>
  )
}
