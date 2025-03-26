import {
  Chip,
  EyeIcon,
  IconFrame,
  ListIcon,
  Modal,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { StackedText } from 'components/utils/table/StackedText'
import { McpServerFragment } from 'generated/graphql'
import { useState } from 'react'
import { McpAuditTable } from './McpAuditTable'

const columnHelper = createColumnHelper<McpServerFragment>()

const ColInfo = columnHelper.accessor((server) => server, {
  id: 'name',
  header: '',
  meta: { gridTemplate: '1fr' },
  cell: function Cell({ getValue }) {
    const { name, url } = getValue()
    return (
      <StackedText
        first={name}
        firstPartialType="body2Bold"
        firstColor="text"
        second={url}
      />
    )
  },
})

const ColConfirm = columnHelper.accessor((server) => server.confirm, {
  id: 'confirm',
  header: '',
  cell: function Cell({ getValue }) {
    return getValue() && <Chip size="small">Confirmation required</Chip>
  },
})

const ColAudit = columnHelper.accessor((server) => server, {
  id: 'audit',
  header: '',
  cell: function Cell({ getValue }) {
    const [showModal, setShowModal] = useState(false)
    const { id, name } = getValue()
    return (
      <>
        <IconFrame
          clickable
          tooltip="Audit trail"
          onClick={() => setShowModal(true)}
          icon={<ListIcon />}
        />
        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          header={`"${name}" mcp server audit trail`}
          size="custom"
        >
          <McpAuditTable id={id} />
        </Modal>
      </>
    )
  },
})

// TODO: once support added on server
// const ColPermissions = columnHelper.accessor((server) => server, {
//   id: 'permissions',
//   header: '',
//   cell: function Cell({ getValue }) {
//     return (
//       <IconFrame
//         clickable
//         tooltip="Permissions"
//         icon={<PeopleIcon />}
//       />
//     )
//   },
// })

const ColView = columnHelper.accessor((server) => server, {
  id: 'view',
  header: '',
  cell: function Cell() {
    return (
      <IconFrame
        clickable
        tooltip="View"
        icon={<EyeIcon />}
      />
    )
  },
})

export const mcpServerColsBasic = [ColInfo, ColConfirm, ColView]

export const mcpServerColsFull = [
  ColInfo,
  ColConfirm,
  ColAudit,
  // ColPermissions,
  ColView,
]
