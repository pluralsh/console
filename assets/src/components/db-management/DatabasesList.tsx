import { Div, Flex } from 'honorable'
import { createColumnHelper } from '@tanstack/react-table'
import { ComponentProps, memo, useMemo, useState } from 'react'
import { filesize } from 'filesize'
import { cpuParser, memoryParser } from 'utils/kubernetes'

import {
  DatabaseTableRowFragment,
  useRestorePostgresMutation,
} from 'generated/graphql'
import { ReadinessT, readinessToSeverity } from 'utils/status'

import {
  Button,
  Chip,
  EmptyState,
  RestoreIcon,
  Table,
  Tooltip,
} from '@pluralsh/design-system'

import { Confirm } from 'components/utils/Confirm'

import { useTheme } from 'styled-components'

import { isNil } from 'lodash'

import { TableText, Usage, numishSort } from '../cluster/TableElements'

import { DatabaseWithId } from './DatabaseManagement'

function RestoreDatabase({ name, namespace, refetch }) {
  const [confirm, setConfirm] = useState(false)
  const [timestamp, _] = useState('')
  const theme = useTheme()

  const [mutation, { loading }] = useRestorePostgresMutation({
    variables: { name, namespace, timestamp: timestamp as unknown as Date },
    onCompleted: () => {
      setConfirm(false)
      refetch()
    },
  })

  return (
    <Div onClick={(e) => e.stopPropagation()}>
      <Button
        floating
        startIcon={<RestoreIcon color={theme.colors['icon-default']} />}
        onClick={() => setConfirm(true)}
      >
        Restore
      </Button>
      <Confirm
        close={() => setConfirm(false)}
        destructive
        label="Delete"
        loading={loading}
        open={confirm}
        submit={() => mutation()}
        title="Delete database"
        text={`The database "${name}"${
          namespace ? ` in namespace "${namespace}"` : ''
        } will be replaced by it's managing controller.`}
      />
    </Div>
  )
}

export type ContainerStatus = { name: string; readiness: ReadinessT }

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

export const ColAge = columnHelper.accessor((_) => '???', {
  id: 'age',
  enableGlobalFilter: false,
  enableSorting: true,
  cell: (props) => <TableText>{props.getValue()}</TableText>,
  header: 'Age',
})

export const ColStatus = columnHelper.accessor(
  (row) => row.status.clusterStatus,
  {
    id: 'status',
    enableGlobalFilter: false,
    enableSorting: true,
    cell: ({ getValue }) => {
      const val = getValue()

      return !!val && <Chip severity={readinessToSeverity[val]}>{val}</Chip>
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
          used={isNil(requests) ? undefined : filesize(requests ?? 0)}
          total={isNil(limits) ? undefined : filesize(limits ?? 0)}
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

export const ColActions = (refetch) =>
  columnHelper.display({
    id: 'actions',
    cell: ({ row: { original } }: any) => (
      <Flex
        flexDirection="row"
        gap="xxsmall"
      >
        <RestoreDatabase
          name={original.name}
          namespace={original.namespace}
          refetch={refetch}
        />
      </Flex>
    ),
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
