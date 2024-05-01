import { createColumnHelper } from '@tanstack/react-table'
import { Violation } from 'generated/graphql'

const columnHelper = createColumnHelper<Violation>()

export const ColRessourceName = columnHelper.accessor(
  (violation) => violation.name,
  {
    id: 'name',
    header: 'Resource Name',
    meta: { truncate: true, gridTemplate: 'auto' },
    cell: function Cell({ getValue }) {
      return getValue()
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
      return getValue()
    },
  }
)

export const ColKind = columnHelper.accessor((violation) => violation.kind, {
  id: 'kind',
  header: 'Kind',
  meta: { truncate: true, gridTemplate: 'auto' },
  cell: function Cell({ getValue }) {
    return getValue()
  },
})

export const ColErrorMessage = columnHelper.accessor(
  (violation) => violation.message,
  {
    id: 'errorMessage',
    header: 'ErrorMessage',
    meta: { truncate: true, gridTemplate: 'auto' },
    cell: function Cell({ getValue }) {
      return getValue()
    },
  }
)
