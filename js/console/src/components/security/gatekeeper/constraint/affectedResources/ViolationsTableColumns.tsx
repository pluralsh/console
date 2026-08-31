import { Tooltip } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Violation } from 'generated/graphql'

const columnHelper = createColumnHelper<Violation>()

export const ColResourceName = columnHelper.accessor(
  (violation) => violation.name,
  {
    id: 'name',
    header: 'Resource Name',
    meta: { truncate: true, gridTemplate: 'minmax(180px,auto)' },
    cell: function Cell({ getValue }) {
      return <div>{getValue()}</div>
    },
  }
)

export const ColNamespace = columnHelper.accessor(
  (violation) => violation.namespace,
  {
    id: 'namespace',
    header: 'Namespace',
    meta: { truncate: true, gridTemplate: 'auto' },
    cell: function Cell({ getValue }) {
      return <div>{getValue()}</div>
    },
  }
)

export const ColKind = columnHelper.accessor((violation) => violation.kind, {
  id: 'kind',
  header: 'Kind',
  meta: { truncate: true, gridTemplate: 'auto' },
  cell: function Cell({ getValue }) {
    return <div>{getValue()}</div>
  },
})

export const ColErrorMessage = columnHelper.accessor(
  (violation) => violation.message,
  {
    id: 'errorMessage',
    header: 'Error Message',
    meta: { truncate: true, gridTemplate: 'minmax(180px,auto)' },
    cell: function Cell({ getValue }) {
      return (
        <Tooltip label={<div css={{ width: 250 }}>{getValue()}</div>}>
          <div>{getValue()}</div>
        </Tooltip>
      )
    },
  }
)
