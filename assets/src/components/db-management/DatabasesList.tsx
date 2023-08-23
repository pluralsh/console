import { Div, Flex } from 'honorable'
import { createColumnHelper } from '@tanstack/react-table'
import { ComponentProps, memo, useMemo, useState } from 'react'
import { filesize } from 'filesize'

import {
  type Maybe,
  PostgresDbFragment,
  useRestorePostgresMutation,
} from 'generated/graphql'
import { ReadinessT } from 'utils/status'

import {
  Button,
  EmptyState,
  RestoreIcon,
  Table,
  Tooltip,
} from '@pluralsh/design-system'

import { Confirm } from 'components/utils/Confirm'

import { useTheme } from 'styled-components'

import { TableText, Usage, numishSort } from '../cluster/TableElements'

function RestoreDatabase({ name, namespace, refetch }) {
  const [confirm, setConfirm] = useState(false)
  const [timestamp, setTimestamp] = useState('')
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
        textValue="Delete"
        tooltip
      />
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

type DatabaseTableRow = {
  name?: string
  version?: string
  databases?: number
  volume: unknown
  cpu: {
    requests?: number
    limits?: number
  }
  memory: {
    requests?: number
    limits?: any
  }
  age: number
  status?: ContainerStatus
}
const columnHelper = createColumnHelper<DatabaseTableRow>()

export const ColName = columnHelper.accessor((row) => row.name, {
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

export const ColMemoryReservation = columnHelper.accessor(
  (row) => row.memory.requests,
  {
    id: 'memory',
    enableSorting: true,
    sortingFn: numishSort,
    cell: ({ row: { original } }) => (
      <Usage
        used={
          original?.memory?.requests === undefined
            ? undefined
            : filesize(original.memory.requests ?? 0)
        }
        total={
          original.memory.limits === undefined
            ? undefined
            : filesize(original.memory.limits ?? 0)
        }
      />
    ),
    header: 'Memory',
  }
)

export const ColCpuReservation = columnHelper.accessor(
  (row) => row?.cpu?.requests,
  {
    id: 'cpu-reservations',
    enableSorting: true,
    sortingFn: numishSort,
    cell: ({ row: { original }, getValue }) => (
      <Usage
        used={getValue()}
        total={original?.cpu?.limits}
      />
    ),
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
          refetch={refetch}
        />
      </Flex>
    ),
    header: '',
  })

type DatabaseListProps = Omit<ComponentProps<typeof Table>, 'data'> & {
  databases?: Maybe<Maybe<PostgresDbFragment>[]>
  columns: any[]
}

export const DatabasesList = memo(
  ({ databases, columns, ...props }: DatabaseListProps) => {
    const filteredDbs = useMemo(
      () =>
        (databases || []).filter(
          (database): database is PostgresDbFragment => !!database
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
        virtualizeRows
        {...props}
      />
    )
  }
)
