import { createColumnHelper } from '@tanstack/react-table'
import { ComponentProps, useMemo } from 'react'
import { filesize } from 'filesize'
import type {
  Container,
  ContainerStatus,
  Maybe,
  Port,
} from 'generated/graphql'
import { ReadinessT, containerStatusToReadiness, readinessToLabel } from 'utils/status'
import {
  IconFrame,
  Table,
  TerminalIcon,
  Tooltip,
} from '@pluralsh/design-system'
import { cpuParser, memoryParser } from 'utils/kubernetes'
import { Flex, Span } from 'honorable'
import { UnstyledLink } from 'components/utils/Link'
import styled from 'styled-components'

import {
  ContainerStatusChip,
  TABLE_HEIGHT,
  TableText,
  Usage,
} from '../TableElements'

type ContainerTableRow = {
  name?: string
  image?: string
  isInit: boolean
  memory: {
    requests?: number
    limits?: number
  }
  cpu: {
    requests?: number
    limits?: number
  }
  ports?: Maybe<Port>[]
  status?: ContainerStatus
  readiness: ReadinessT
}
const columnHelper = createColumnHelper<ContainerTableRow>()

const ColStatus = columnHelper.accessor(row => (row?.readiness ? readinessToLabel[row.readiness] : ''),
  {
    id: 'status',
    cell: ({ row: { original } }) => (
      <div><ContainerStatusChip readiness={original?.readiness} /></div>
    ),
    header: 'Status',
  })

const ColName = columnHelper.accessor(row => row.name, {
  id: 'name',
  cell: ({ row: { original }, ...props }) => (
    <TableText>
      <Tooltip
        label={props.getValue()}
        placement="top-start"
      >
        <span>{`${original.isInit ? 'init: ' : ''}${props.getValue()}`}</span>
      </Tooltip>
    </TableText>
  ),
  header: 'Name',
  meta: {
    truncate: true,
  },
})

const ColImage = columnHelper.accessor(row => row.image, {
  id: 'image',
  cell: props => (
    <Tooltip
      label={props.getValue()}
      placement="top-start"
    >
      <Span
        color="text-light"
        direction="rtl"
        textAlign="left"
      >
        {props.getValue()}
      </Span>
    </Tooltip>
  ),
  header: 'Image',
  meta: {
    truncate: true,
  },
})

const ColPorts = columnHelper.accessor(row => row.ports, {
  id: 'ports',
  cell: props => {
    const content = props
      .getValue()
      ?.map(port => (port ? (
        <div>
          {port.protocol ? `${port.protocol} ` : ''}
          {port.containerPort}
        </div>
      ) : undefined))
      .filter(port => !!port)

    return (
      <TableText>{!content || content.length === 0 ? '—' : content}</TableText>
    )
  },
  header: 'Ports',
})

const ColMemoryReservation = columnHelper.accessor(row => row?.memory?.requests, {
  id: 'memory',
  cell: ({ row: { original }, ...props }) => {
    const requests = props.getValue()

    return (
      <Usage
        used={
          requests === undefined
            ? undefined
            : filesize(requests)
        }
        total={
          original.memory.limits === undefined
            ? undefined
            : filesize(original.memory.limits)
        }
      />
    )
  },
  header: 'Memory',
})

const ColCpuReservation = columnHelper.accessor(row => row?.cpu?.requests, {
  id: 'cpu-reservations',
  cell: ({ row: { original }, ...props }) => (
    <Usage
      used={props.getValue()}
      total={original?.cpu?.limits}
    />
  ),
  header: 'CPU',
})

function ShellLinkUnstyled({
  textValue,
  ...props
}: ComponentProps<typeof UnstyledLink> & { textValue: string }) {
  return (
    <UnstyledLink {...props}>
      <Tooltip
        label={textValue}
        placement="top"
      >
        <IconFrame
          clickable
          textValue={textValue}
          size="medium"
          icon={<TerminalIcon />}
        />
      </Tooltip>
    </UnstyledLink>
  )
}
export const ShellLink = styled(ShellLinkUnstyled)(({ theme }) => ({
  'a&': {
    color: theme.colors['icon-default'],
  },
}))

export const ColActions = ({
  podName,
  namespace,
}: {
  podName?: string
  namespace?: string
}) => columnHelper.display({
  id: 'actions',
  cell: ({ row: { original } }: any) => (
    <Flex
      flexDirection="row"
      gap="xxsmall"
    >
      <ShellLink
        to={`/pods/${namespace}/${podName}/shell/${original.name}`}
        textValue={`Launch ${original?.name} shell`}
      />
    </Flex>
  ),
  header: '',
})

type ContainersListProps = {
  containers?: Maybe<Container>[]
  containerStatuses?: Record<string, Maybe<ContainerStatus>>
  initContainers?: Maybe<Container>[]
  initContainerStatuses?: Record<string, Maybe<ContainerStatus>>
  namespace: string
  podName: string
  refetch?: any
  columns?: any[]
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
    },
    cpu: {
      requests: cpuRequests,
      limits: cpuLimits,
    },
    ports: container.ports || undefined,
    readiness: containerStatusToReadiness(status),
  }
}

export function ContainersList({
  containers,
  containerStatuses,
  initContainers,
  initContainerStatuses,
  columns,
  namespace,
  podName,
}: ContainersListProps) {
  const tableData: ContainerTableRow[] = useMemo(() => {
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

  columns = useMemo(() => columns ?? [
    ColName,
    ColImage,
    ColMemoryReservation,
    ColCpuReservation,
    ColPorts,
    ColStatus,
    ColActions({ podName, namespace }),
  ],
  [columns, namespace, podName])

  if (!containers || containers.length === 0) {
    return <>No containers available.</>
  }

  console.log(containers)

  return (
    <Table
      loose
      data={tableData}
      columns={columns}
      enableColumnResizing
      {...TABLE_HEIGHT}
    />
  )
}
