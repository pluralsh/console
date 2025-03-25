import { createColumnHelper } from '@tanstack/react-table'
import UserInfo from 'components/utils/UserInfo'
import { McpServerFragment } from 'generated/graphql'

const columnHelper = createColumnHelper<McpServerFragment>()

const ColInfo = columnHelper.accessor((server) => server, {
  id: 'name',
  header: '',
  meta: { gridTemplate: '1fr' },
  cell: function Cell({ getValue }) {
    return <span>{getValue()?.name}</span>
  },
})

const ColConfirm = columnHelper.accessor((server) => server, {
  id: 'confirm',
  header: '',
  cell: function Cell({ getValue }) {
    return <span>{`${getValue()?.confirm?.valueOf()}`}</span>
  },
})

const ColAudit = columnHelper.accessor((server) => server, {
  id: 'audit',
  header: '',
  cell: function Cell({ getValue }) {
    return <span>audit</span>
  },
})

const ColPermissions = columnHelper.accessor((server) => server, {
  id: 'permissions',
  header: '',
  cell: function Cell({ getValue }) {
    return <span>permissions</span>
  },
})

const ColView = columnHelper.accessor((server) => server, {
  id: 'view',
  header: '',
  cell: function Cell({ getValue }) {
    return <span>view</span>
  },
})

export const mcpServerColsBasic = [ColInfo, ColConfirm, ColView]

export const mcpServerColsFull = [
  ColInfo,
  ColConfirm,
  ColAudit,
  ColPermissions,
  ColView,
]
