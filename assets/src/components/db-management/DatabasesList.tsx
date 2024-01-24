import { Div, Flex } from 'honorable'
import { createColumnHelper } from '@tanstack/react-table'
import { ComponentProps, memo, useMemo, useState } from 'react'
import { cpuParser, memoryFormat, memoryParser } from 'utils/kubernetes'

import {
  DatabaseTableRowFragment,
  usePostgresDatabasesQuery,
} from 'generated/graphql'

import {
  Button,
  Chip,
  EmptyState,
  RestoreIcon,
  Table,
  Tooltip,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { isNil } from 'lodash'
import moment from 'moment-timezone'
import { fromNowMin } from 'utils/time'

import { TooltipTime } from 'components/utils/TooltipTime'

import { TableText, Usage, numishSort } from '../cluster/TableElements'

import { DatabaseWithId } from './DatabaseManagement'
import { RestoreDatabaseModal } from './RestoreDatabaseModal'

function RestoreDatabase({
  name,
  namespace,
  refetch,
}: {
  name: string
  namespace: string
  refetch?: ReturnType<typeof usePostgresDatabasesQuery>['refetch']
}) {
  const [isOpen, setIsOpen] = useState(false)
  const theme = useTheme()

  return (
    <Div onClick={(e) => e.stopPropagation()}>
      <Button
        floating
        startIcon={<RestoreIcon color={theme.colors['icon-default']} />}
        onClick={() => setIsOpen(true)}
      >
        Restore
      </Button>
      {isOpen && (
        <RestoreDatabaseModal
          name={name}
          namespace={namespace}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          refetch={refetch}
        />
      )}
    </Div>
  )
}

const columnHelper = createColumnHelper<DatabaseWithId>()

export const ColName = columnHelper.accessor((row) => row.metadata.name, {
  id: 'name',
  enableGlobalFilter: true,
  enableSorting: true,
  cell: (props) => (
    <Tooltip
      label={props.getValue()}
      placement="top-start"
    >
      <TableText>{props.getValue()}</TableText>
    </Tooltip>
  ),
  header: 'Name',
})

export const ColNamespace = columnHelper.accessor(
  (row) => row.metadata.namespace,
  {
    id: 'namespace',
    enableGlobalFilter: false,
    enableSorting: true,
    cell: (props) => (
      <Tooltip
        label={props.getValue()}
        placement="top-start"
      >
        <TableText>{props.getValue()}</TableText>
      </Tooltip>
    ),
    header: 'Namespace',
  }
)

export const ColVersion = columnHelper.accessor(
  (row) => row.spec.postgresql?.version,
  {
    id: 'version',
    enableGlobalFilter: false,
    enableSorting: true,
    cell: (props) => <TableText>{props.getValue()}</TableText>,
    header: 'Version',
  }
)

export const ColInstances = columnHelper.accessor(
  (row) => row.spec.numberOfInstances,
  {
    id: 'numberOfInstances',
    enableGlobalFilter: false,
    enableSorting: true,
    cell: (props) => <TableText>{props.getValue()}</TableText>,
    header: 'Instances',
  }
)

export const ColAge = columnHelper.accessor(
  (row) => moment().diff(moment(row.metadata.creationTimestamp), 'days', true),
  {
    id: 'age',
    enableGlobalFilter: false,
    enableSorting: true,
    cell: ({ row: { original } }) => {
      const age = fromNowMin(moment(original.metadata.creationTimestamp), true)

      return (
        <TableText>
          <TooltipTime
            date={original.metadata.creationTimestamp}
            prefix="Created: "
          >
            {age}
          </TooltipTime>
        </TableText>
      )
    },
    header: 'Age',
  }
)

export const ColVolume = columnHelper.accessor(
  (row) => memoryParser(row.spec.volume?.size),
  {
    id: 'volume',
    enableGlobalFilter: false,
    enableSorting: true,
    cell: ({ getValue }) => {
      const size = memoryFormat(getValue())

      return <TableText>{typeof size === 'string' ? size : '–'}</TableText>
    },
    header: 'Volume',
  }
)

const statusToSeverity = (
  status: string | null | undefined
): ComponentProps<typeof Chip>['severity'] => {
  if (!status) {
    return 'warning'
  }
  if (status.match(/fail/m)) {
    return 'danger'
  }
  if (status.match(/running/i)) {
    return 'success'
  }

  return 'warning'
}

export const ColStatus = columnHelper.accessor(
  (row) => row.status?.clusterStatus,
  {
    id: 'status',
    enableGlobalFilter: false,
    enableSorting: true,
    cell: ({ getValue }) => {
      const val = getValue() || 'Creating'
      const severity = statusToSeverity(val)

      return !!val && <Chip severity={severity}>{val}</Chip>
    },
    header: 'Status',
  }
)

export const ColMemoryReservation = columnHelper.accessor(
  (row) => memoryParser(row?.spec?.resources?.requests?.memory) || 0,
  {
    id: 'memory',
    enableSorting: true,
    sortingFn: numishSort,
    cell: ({ row: { original }, getValue }) => {
      const requests = getValue()
      const limits = memoryParser(original.spec.resources?.limits?.memory)

      return (
        <Usage
          used={isNil(requests) ? undefined : memoryFormat(requests ?? 0)}
          total={isNil(limits) ? undefined : memoryFormat(limits ?? 0)}
        />
      )
    },
    header: 'Memory',
  }
)

export const ColCpuReservation = columnHelper.accessor(
  (row) => cpuParser(row.spec.resources?.requests?.cpu),
  {
    id: 'cpu-reservations',
    enableSorting: true,
    sortingFn: numishSort,
    cell: ({ row: { original }, getValue }) => {
      const requests = getValue()
      const limits = cpuParser(original.spec.resources?.limits?.cpu)

      return (
        <Usage
          used={requests}
          total={limits}
        />
      )
    },
    header: 'CPU',
  }
)

export const ColActions = (
  refetch?: ReturnType<typeof usePostgresDatabasesQuery>['refetch']
) =>
  columnHelper.display({
    id: 'actions',
    cell: ({ row: { original } }) => {
      const { name } = original.metadata
      const { namespace } = original.metadata

      return (
        name &&
        namespace && (
          <Flex
            flexDirection="row"
            gap="xxsmall"
          >
            <RestoreDatabase
              name={name}
              namespace={namespace}
              refetch={refetch}
            />
          </Flex>
        )
      )
    },
    header: '',
  })

type DatabaseListProps = Omit<ComponentProps<typeof Table>, 'data'> & {
  databases?: DatabaseTableRowFragment[]
  columns: any[]
}

export const DatabasesList = memo(
  ({ databases, columns, ...props }: DatabaseListProps) => {
    const filteredDbs = useMemo(
      () =>
        (databases || []).filter(
          (database): database is DatabaseTableRowFragment => !!database
        ),
      [databases]
    )

    if (!databases || filteredDbs.length === 0) {
      return <EmptyState message="No databases available." />
    }

    return (
      <Table
        data={filteredDbs}
        columns={columns}
        // virtualizeRows
        {...props}
      />
    )
  }
)
