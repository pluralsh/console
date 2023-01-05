import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { filesize } from 'filesize'

import type {
  Container,
  ContainerStatus,
  Maybe,
  Port,
} from 'generated/graphql'
import { ReadinessT, containerStatusToReadiness, readinessToChipTitle } from 'utils/status'

import { Tooltip } from '@pluralsh/design-system'

import { cpuParser, memoryParser } from 'utils/kubernetes'

import {
  GridTable,
  StatusChip,
  TABLE_HEIGHT,
  TableCaretLink,
  TableText,
  Usage,
} from '../TableElements'

type ContainerTableRow = {
  name?: string
  isInit: boolean
  memory: {
    requests?: number
    limits?: any
  }
  cpu: {
    requests?: number
    limits?: any
  }
  ports?: Maybe<Port>[]
  status?: ContainerStatus
  readiness: ReadinessT
}
const columnHelper = createColumnHelper<ContainerTableRow>()

const ColStatus = columnHelper.accessor(row => (row?.readiness ? readinessToChipTitle[row.readiness] : ''),
  {
    id: 'status',
    cell: ({ row: { original } }) => (
      <StatusChip readiness={original?.readiness} />
    ),
    header: 'Status',
  })

export const ColName = columnHelper.accessor(row => row.name, {
  id: 'name',
  cell: ({ row: { original }, ...props }) => (
    <Tooltip
      label={props.getValue()}
      placement="top"
    >
      <TableText>
        {`${original.isInit && 'init:'}${props.getValue()}`}
      </TableText>
    </Tooltip>
  ),
  header: 'Name',
})

export const ColPorts = columnHelper.accessor(row => row.ports, {
  id: 'ports',
  cell: props => (
    <TableText>
      {props
        .getValue()
        ?.map(port => (port ? `${port.protocol} ${port.containerPort}` : undefined))
        .filter(port => !!port)
        .join(', ')}
    </TableText>
  ),
  header: 'Ports',
})

export const ColMemory = columnHelper.accessor(row => row.name, {
  id: 'memory',
  cell: ({ row: { original } }) => (
    <Usage
      used={
        original?.memory?.requests === undefined
          ? undefined
          : filesize(original.memory.requests)
      }
      total={
        original.memory.limits === undefined
          ? undefined
          : filesize(original.memory.limits)
      }
    />
  ),
  header: 'Memory',
})

export const ColCpu = columnHelper.accessor(row => row?.cpu?.requests, {
  id: 'cpu',
  cell: props => (
    // <Usage
    //   used={original?.cpu?.requests}
    //   total={original?.cpu?.limits}
    // />
    <TableText>{props.getValue()}</TableText>
  ),
  header: 'CPU',
})

export const ColLink = columnHelper.display({
  id: 'link',
  cell: ({ row: { original } }: any) => (
    <TableCaretLink
      to={`/containers/${original.namespace}/${original.name}`}
      textValue={`View node ${original?.name}`}
    />
  ),
  header: '',
})

type ContainerListProps = {
  containers?: Maybe<Container>[]
  containerStatuses?: Record<string, Maybe<ContainerStatus>>
  initContainers?: Maybe<Container>[]
  initContainerStatuses?: Record<string, Maybe<ContainerStatus>>
  namespace?: any
  refetch?: any
  columns?: any[]
  truncColIndex?: number
}

function toTableData(container: Container,
  {
    statuses,
    isInit = false,
  }: { isInit: boolean; statuses?: Record<string, Maybe<ContainerStatus>> }) {
  const requests = container?.resources?.requests
  const limits = container?.resources?.limits
  const memoryRequests = memoryParser(requests?.memory)
  const cpuRequests = cpuParser(requests?.cpu)
  const memoryLimits = memoryParser(limits?.memory)
  const cpuLimits = cpuParser(limits?.cpu)

  const status = container?.name ? statuses?.[container?.name] : undefined

  return {
    name: container?.name || undefined,
    image: container?.image || undefined,
    isInit,
    memory: {
      requests: memoryRequests,
      limits: memoryLimits,
      sortVal: (memoryRequests ?? 0) / (memoryLimits ?? Infinity),
    },
    cpu: {
      requests: cpuRequests,
      limits: cpuLimits,
      sortVal: (cpuRequests ?? 0) / (cpuLimits ?? Infinity),
    },
    ports: container.ports || undefined,
    readiness: containerStatusToReadiness(status),
  }
}

export function ContainerList({
  containers,
  containerStatuses,
  initContainers,
  initContainerStatuses,
  columns = [ColName, ColMemory, ColCpu, ColPorts, ColStatus],
  truncColIndex = 0,
  namespace: _namespace,
  refetch: _refetch,
}: ContainerListProps) {
  const tableData: ContainerTableRow[] = useMemo(() => {
    console.log('')

    const initContainerData = (initContainers || [])
      .filter((container): container is Container => !!container)
      .map(container => toTableData(container, {
        isInit: true,
        statuses: initContainerStatuses,
      }))
    const containerData = (containers || [])
      .filter((container): container is Container => !!container)
      .map(container => toTableData(container, { isInit: false, statuses: containerStatuses }))

    return [...initContainerData, ...containerData]
  }, [containerStatuses, containers, initContainerStatuses, initContainers])

  if (!containers || containers.length === 0) {
    return <>No containers available.</>
  }

  return (
    <GridTable
      data={tableData}
      columns={columns}
      enableColumnResizing
      $truncColIndex={truncColIndex}
      {...TABLE_HEIGHT}
    />
  )
}
