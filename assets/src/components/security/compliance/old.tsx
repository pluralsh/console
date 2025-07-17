import { createColumnHelper } from '@tanstack/react-table'
import { Edge } from '../../../utils/graphql.ts'
import { ComplianceReportFragment } from '../../../generated/graphql.ts'
import { DateTimeCol } from '../../utils/table/DateTimeCol.tsx'

const columnHelper = createColumnHelper<Edge<ComplianceReportFragment>>()

export const columns = [
  columnHelper.accessor(({ node }) => node?.name, {
    id: 'name',
    header: 'Report name',

    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelper.accessor(({ node }) => node?.sha256, {
    id: 'sha256',
    header: 'SHA256',
    meta: { truncate: true },
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelper.accessor(({ node }) => node?.insertedAt, {
    id: 'insertedAt',
    header: 'Created',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
]
