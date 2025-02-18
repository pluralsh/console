import {
  Chip,
  CollapseIcon,
  IconFrame,
  Prop,
  Table,
  TerminalIcon,
  Tooltip,
} from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { UnstyledLink } from 'components/utils/Link'
import { filesize } from 'filesize'
import { Container, ContainerStatus, Maybe, Port } from 'generated/graphql'
import { Flex, Span } from 'honorable'
import { ComponentProps, CSSProperties, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { cpuParser, memoryParser } from 'utils/kubernetes'
import {
  Readiness,
  ReadinessT,
  containerStatusToReadiness,
  readinessToLabel,
  readinessToSeverity,
  readinessToContainerLabel,
} from 'utils/status'

import { Overline } from 'components/cd/utils/PermissionsModal.tsx'
import { formatDateTime } from 'utils/datetime'
import { TableText, Usage } from '../../../cluster/TableElements.tsx'

export const TABLE_HEIGHT = {
  maxHeight: 'clamp(390px, calc(100vh - 260px), 1000px)',
} satisfies CSSProperties

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

export const columnHelper = createColumnHelper<ContainerTableRow>()

export const ColStatus = columnHelper.accessor(
  (row) => (row?.readiness ? readinessToLabel[row.readiness] : ''),
  {
    id: 'status',
    cell: ({ row: { original } }) => (
      <div>
        <Chip severity={readinessToSeverity[original?.readiness]}>
          {readinessToContainerLabel[original?.readiness]}
        </Chip>
      </div>
    ),
    header: 'Status',
  }
)

export const ColExpander = {
  id: 'expander',
  header: () => {},
  meta: { gridTemplate: '48px' },
  cell: ({ row }) =>
    row.getCanExpand() && (
      <CollapseIcon
        size={8}
        cursor="pointer"
        style={{
          alignSelf: 'center',
          transform: `rotate(${row.getIsExpanded() ? 270 : 180}deg)`,
          transition: 'transform .2s',
        }}
        onClick={(e) => {
          e.stopPropagation()
          row.getToggleExpandedHandler()()
        }}
      />
    ),
}

export const ColName = columnHelper.accessor((row) => row.name, {
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

export const ColImage = columnHelper.accessor((row) => row.image, {
  id: 'image',
  cell: (props) => (
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

export const ColPorts = columnHelper.accessor((row) => row.ports, {
  id: 'ports',
  cell: (props) => {
    const content = props
      .getValue()
      ?.map((port) =>
        port ? (
          <div>
            {port.protocol ? `${port.protocol} ` : ''}
            {port.containerPort}
          </div>
        ) : undefined
      )
      .filter((port) => !!port)

    return (
      <TableText>{!content || content.length === 0 ? '—' : content}</TableText>
    )
  },
  header: 'Ports',
})

export const ColMemoryReservation = columnHelper.accessor(
  (row) => row?.memory?.requests,
  {
    id: 'memory',
    cell: ({ row: { original }, ...props }) => {
      const requests = props.getValue()

      return (
        <Usage
          used={requests === undefined ? undefined : filesize(requests)}
          total={
            original.memory.limits === undefined
              ? undefined
              : filesize(original.memory.limits)
          }
        />
      )
    },
    header: 'Memory',
  }
)

export const ColCpuReservation = columnHelper.accessor(
  (row) => row?.cpu?.requests,
  {
    id: 'cpu-reservations',
    cell: ({ row: { original }, ...props }) => (
      <Usage
        used={props.getValue()}
        total={original?.cpu?.limits}
      />
    ),
    header: 'CPU',
  }
)

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
}) =>
  columnHelper.display({
    id: 'actions',
    cell: ({
      row: {
        original: { name, readiness },
      },
    }: any) =>
      readiness &&
      readiness === Readiness.Ready && (
        <Flex
          flexDirection="row"
          gap="xxsmall"
        >
          <ShellLink
            to={`/pods/${namespace}/${podName}/shell/${name}`}
            textValue={`Launch ${name} shell`}
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
  clusterId?: string
  serviceId?: string
  refetch?: any
  columns?: any[]
  rowLink?: boolean
}

function toTableData(
  container: Container,
  {
    statuses,
    isInit = false,
  }: { isInit: boolean; statuses?: Record<string, Maybe<ContainerStatus>> }
): ContainerTableRow {
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
    status: status ?? undefined,
  }
}

export function PodContainers({
  containers,
  containerStatuses,
  initContainers,
  initContainerStatuses,
  columns,
  namespace,
  podName,
  clusterId,
  serviceId,
  rowLink = true,
}: ContainersListProps) {
  const navigate = useNavigate()
  const tableData: ContainerTableRow[] = useMemo(() => {
    const initContainerData = (initContainers || [])
      .filter((container): container is Container => !!container)
      .map((container) =>
        toTableData(container, {
          isInit: true,
          statuses: initContainerStatuses,
        })
      )
    const containerData = (containers || [])
      .filter((container): container is Container => !!container)
      .map((container) =>
        toTableData(container, { isInit: false, statuses: containerStatuses })
      )

    return [...initContainerData, ...containerData]
  }, [containerStatuses, containers, initContainerStatuses, initContainers])

  columns = useMemo(
    () =>
      columns ?? [
        ColExpander,
        ColName,
        ColImage,
        ColMemoryReservation,
        ColCpuReservation,
        ColPorts,
        ColStatus,
        ColActions({ podName, namespace }),
      ],
    [columns, namespace, podName]
  )

  if (!containers || containers.length === 0) {
    return <>No containers available.</>
  }

  return (
    <Table
      loose
      data={tableData}
      columns={columns}
      reactTableOptions={{
        meta: {
          clusterId,
          serviceId,
          podName,
          namespace,
        },
      }}
      {...TABLE_HEIGHT}
      getRowCanExpand={(row: Row<ContainerTableRow>) =>
        row.original.status?.state?.terminated ||
        row.original.status?.state?.waiting
      }
      renderExpanded={ContainerExpansionPanel}
      {...(rowLink
        ? {
            onRowClick: (_e, { original }) =>
              original?.readiness === Readiness.Ready &&
              navigate(`/pods/${namespace}/${podName}/shell/${original?.name}`),
          }
        : {})}
    />
  )
}

export function ContainerExpansionPanel({
  row,
}: {
  row: Row<ContainerTableRow>
}) {
  const theme = useTheme()
  const {
    original: { status },
  } = row

  return (
    <div>
      {status?.state?.terminated && (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.small,
          }}
        >
          <Overline css={{ color: theme.colors['text-xlight'] }}>
            Terminated
          </Overline>
          <div
            css={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: theme.spacing.small,
            }}
          >
            <Prop
              title="Started"
              margin={0}
            >
              {formatDateTime(
                status?.state?.terminated.startedAt,
                'MMM D, YYYY h:mm'
              )}
            </Prop>
            <Prop
              title="Finished"
              margin={0}
            >
              {formatDateTime(
                status?.state?.terminated.finishedAt,
                'MMM D, YYYY h:mm'
              )}
            </Prop>
            <Prop
              title="Exit code"
              margin={0}
            >
              {status?.state?.terminated.exitCode}
            </Prop>
            <Prop
              title="Reason"
              margin={0}
            >
              {status?.state?.terminated.reason}
            </Prop>
            <Prop
              title="Message"
              margin={0}
            >
              {status?.state?.terminated.message ?? '-'}
            </Prop>
          </div>
        </div>
      )}
      {status?.state?.waiting && (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.small,
          }}
        >
          <Overline css={{ color: theme.colors['text-xlight'] }}>
            Waiting
          </Overline>
          <div
            css={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: theme.spacing.small,
            }}
          >
            <Prop
              title="Reason"
              margin={0}
            >
              {status?.state?.waiting.reason}
            </Prop>
            <Prop
              title="Message"
              margin={0}
            >
              {status?.state?.waiting.message ?? '-'}
            </Prop>
          </div>
        </div>
      )}
    </div>
  )
}
