import {
  ArrowTopRightIcon,
  Button,
  Chip,
  EmptyState,
  Table,
} from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'

import { createColumnHelper } from '@tanstack/react-table'
import { StackMinimalFragment } from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { useServiceContext } from './ServiceDetails'
import { capitalize } from 'lodash'
import { StackStatusChip } from 'components/stacks/common/StackStatusChip'
import { Link } from 'react-router-dom'
import { getStacksAbsPath } from 'routes/stacksRoutesConsts'

const columnHelper = createColumnHelper<StackMinimalFragment>()

export function ServiceStackImports() {
  const { service } = useServiceContext()
  const stacks =
    service?.imports
      ?.filter(isNonNullable)
      ?.map((svcImport) => svcImport.stack) ?? []

  if (isEmpty(stacks)) return <EmptyState message="No stack imports found." />

  return (
    <Table
      fullHeightWrap
      data={stacks}
      columns={columns}
    />
  )
}

const columns = [
  columnHelper.accessor('name', {
    id: 'name',
    header: 'Name',
    meta: { gridTemplate: '1fr' },
  }),
  columnHelper.accessor((stack) => capitalize(stack.type), {
    id: 'type',
    header: 'Type',
    meta: { gridTemplate: '1fr' },
    cell: ({ getValue }) => {
      return <Chip>{getValue()}</Chip>
    },
  }),
  columnHelper.accessor('status', {
    id: 'status',
    header: 'Status',
    meta: { gridTemplate: '1fr' },
    cell: ({ getValue }) => {
      return <StackStatusChip status={getValue()} />
    },
  }),
  columnHelper.accessor('id', {
    id: 'actions',
    header: '',
    cell: ({ getValue }) => {
      return (
        <Button
          small
          floating
          endIcon={<ArrowTopRightIcon />}
          as={Link}
          to={getStacksAbsPath(getValue())}
        >
          View details
        </Button>
      )
    },
  }),
]
