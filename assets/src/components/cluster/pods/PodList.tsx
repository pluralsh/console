import { A } from 'honorable'
import { Link } from 'react-router-dom'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { filesize } from 'filesize'

import type { Maybe, Pod } from 'generated/graphql'
import { Readiness, ReadinessT, containerStatusToReadiness } from 'utils/status'

import { Tooltip } from '@pluralsh/design-system'

import {
  ContainersReadyChip,
  GridTable,
  TABLE_HEIGHT,
  TableCaretLink,
  TableText,
  Usage,
} from '../TableElements'

import { DeletePod, podResources } from './Pod-old'

export type ContainerStatus = {name: string, readiness: ReadinessT}

type PodTableRow = {
  name?: string
  nodeName?: string
  namespace?: string
  memory: {
    used?: number
    total?: any
  }
  cpu: {
    used?: number
    total?: number
  }
  restarts?: number
  containers?: {
    ready?: number
    total?: number
    statuses?: ContainerStatus[]
  }
}
const columnHelper = createColumnHelper<PodTableRow>()

export const ColNameLink = columnHelper.accessor(row => row.name, {
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
          to={`/pods/${original.namespace}/${original.name}`}
        >
          {props.getValue()}
        </A>
      </TableText>
    </Tooltip>
  ),
  header: 'Name',
})

export const ColName = columnHelper.accessor(row => row.name, {
  id: 'name',
  cell: props => <TableText>{props.getValue()}</TableText>,
  header: 'Name',
})

export const ColNodeName = columnHelper.accessor(pod => pod.nodeName, {
  id: 'nodeName',
  cell: ({ row: { original }, ...props }) => (
    <Tooltip
      label={original.nodeName}
      placement="top"
    >
      <TableText>
        <A
          inline
          as={Link}
          to={`/nodes/${original.nodeName}`}
          display="inline"
        >
          {props.getValue()}
        </A>
      </TableText>
    </Tooltip>
  ),
  header: 'Node name',
})

export const ColMemory = columnHelper.accessor(row => row.name, {
  id: 'memory',
  cell: ({ row: { original } }) => (
    <Usage
      used={
        original?.memory?.used === undefined
          ? undefined
          : filesize(original.memory.used)
      }
      total={
        original.memory.total === undefined
          ? undefined
          : filesize(original.memory.total)
      }
    />
  ),
  header: 'Memory',
})

export const ColCpu = columnHelper.accessor(row => row.name, {
  id: 'cpu',
  cell: ({ row: { original } }) => (
    <Usage
      used={original?.cpu?.used}
      total={original?.cpu?.total}
    />
  ),
  header: 'CPU',
})

export const ColRestarts = columnHelper.accessor(row => row.name, {
  id: 'restarts',
  cell: ({ row: { original } }) => <TableText>{original.restarts}</TableText>,
  header: 'Restarts',
})

export const ColContainers = columnHelper.accessor(row => row.name, {
  id: 'containers',
  cell: ({ row: { original } }) => (
    <ContainersReadyChip
      ready={original?.containers?.ready || 0}
      total={original?.containers?.total || 0}
      statuses={original?.containers?.statuses || []}
    />
  ),
  header: 'Containers',
})

export const ColLink = columnHelper.display({
  id: 'link',
  cell: ({ row: { original } }: any) => (
    <TableCaretLink
      to={`/pods/${original.namespace}/${original.name}`}
      textValue={`View node ${original?.name}`}
    />
  ),
  header: '',
})

export const ColDelete = (namespace, refetch) => columnHelper.accessor(row => row.name, {
  id: 'delete',
  cell: ({ row: { original } }) => (
    <DeletePod
      name={original.name}
      namespace={namespace}
      refetch={refetch}
    />
  ),
  header: '',
})

type PodListProps = {
  pods?: Maybe<Pod>[] & Pod[]
  namespace?: any
  refetch?: any
  columns?: any[]
  truncColIndexes?: number[]
}

function getRestarts(status: Pod['status']) {
  return (status.containerStatuses || []).reduce((count, status) => count + ((status as any)?.restartCount || 0),
    0)
}

function getAllStatuses({
  containerStatuses,
  initContainerStatuses,
}: Pod['status']) {
  return [...(initContainerStatuses || []), ...(containerStatuses || [])]
}

function getContainersStats(status: Pod['status']): {
  ready?: number
  total?: number
  statuses?: ContainerStatus[]
} {
  const allStatuses = getAllStatuses(status)

  const readyCount = allStatuses.reduce((prev, status) => {
    if (!status) {
      return prev
    }
    const readiness = containerStatusToReadiness(status)

    return {
      ready: prev.ready + (readiness === Readiness.Ready ? 1 : 0),
      total: prev.total + 1,
    }
  },
  { ready: 0, total: 0 })

  const statuses = allStatuses.map(status => ({
    name: status?.name,
    readiness: containerStatusToReadiness(status),
  }) as ContainerStatus)

  return { statuses, ...readyCount }
}

export function PodList({
  pods,
  columns = [
    ColNameLink,
    ColMemory,
    ColCpu,
    ColRestarts,
    ColContainers,
    ColLink,
  ],
  truncColIndexes = [0],
  namespace: _namespace,
  refetch: _refetch,
}: PodListProps) {
  const tableData: PodTableRow[] = useMemo(() => (pods || [])
    .filter((pod): pod is Pod => !!pod)
    .map(pod => {
      const { containers } = pod.spec
      const containersStats = getContainersStats(pod.status)

      const { cpu: cpuRequests, memory: memoryRequests } = podResources(containers as any,
        'requests')
      const { cpu: cpuLimits, memory: memoryLimits } = podResources(containers as any,
        'limits')

      return {
        name: pod?.metadata?.name,
        nodeName: pod?.spec?.nodeName || undefined,
        namespace: pod?.metadata?.namespace || undefined,
        memory: {
          used: memoryRequests,
          total: memoryLimits,
          sortVal: (memoryRequests ?? 0) / (memoryLimits ?? Infinity),
        },
        cpu: {
          used: cpuRequests,
          total: cpuLimits,
          sortVal: (cpuRequests ?? 0) / (cpuLimits ?? Infinity),
        },
        restarts: getRestarts(pod.status),
        containers: containersStats,
      }
    }),
  [pods])

  if (!pods || pods.length === 0) {
    return <>No pods available.</>
  }

  return (
    <GridTable
      data={tableData}
      columns={columns}
      enableColumnResizing
      $truncColIndexes={truncColIndexes}
      {...TABLE_HEIGHT}
    />
  )
}
