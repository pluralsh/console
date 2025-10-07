import {
  Chip,
  Flex,
  IconFrame,
  ListIcon,
  PeopleIcon,
  Spinner,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { StackedText } from 'components/utils/table/StackedText'
import { McpServerFragment } from 'generated/graphql'
import { useState } from 'react'
import { McpAuditModal } from './McpAuditTable'
import { ViewMcpServerDetails } from './McpServerDetails'
import {
  PermissionsIdType,
  PermissionsModal,
} from 'components/cd/utils/PermissionsModal'

export type McpTableAction =
  | 'audit'
  | 'permissions'
  | 'view'
  | 'removeConnection'

const columnHelper = createColumnHelper<McpServerFragment>()

export const ColInfo = columnHelper.accessor((server) => server, {
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

export const ColConfirm = columnHelper.accessor((server) => server.confirm, {
  id: 'confirm',
  header: '',
  cell: function Cell({ getValue }) {
    return getValue() && <Chip size="small">Confirmation required</Chip>
  },
})

export const ColActions = columnHelper.accessor((server) => server, {
  id: 'actions',
  header: '',
  cell: function Cell({ getValue, table: { options } }) {
    const { actions, removeServer, loading } =
      (options.meta as {
        actions?: McpTableAction[]
        removeServer?: (server: McpServerFragment) => void
        loading?: boolean
      }) ?? {}
    const server = getValue()
    return (
      <Flex gap="xsmall">
        {actions?.includes('audit') && (
          <AuditAction
            id={server.id}
            name={server.name}
          />
        )}
        {actions?.includes('permissions') && (
          <PermissionsAction server={server} />
        )}
        {actions?.includes('view') && (
          <ViewAction
            server={server}
            removeServer={removeServer}
            loading={loading}
          />
        )}
        {actions?.includes('removeConnection') && (
          <RemoveConnectionAction
            server={server}
            removeServer={removeServer}
            loading={loading}
          />
        )}
      </Flex>
    )
  },
})

function AuditAction({ id, name }: { id: string; name: string }) {
  const [showModal, setShowModal] = useState(false)
  return (
    <>
      <IconFrame
        clickable
        tooltip="Audit trail"
        onClick={() => setShowModal(true)}
        icon={<ListIcon />}
      />
      <McpAuditModal
        id={id}
        name={name}
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}

function PermissionsAction({
  server,
  refetch,
}: {
  server: McpServerFragment
  refetch?: () => void
}) {
  const [showPermissions, setShowPermissions] = useState(false)
  return (
    <>
      <IconFrame
        clickable
        tooltip="Permissions"
        onClick={() => setShowPermissions(true)}
        icon={<PeopleIcon />}
      />
      <PermissionsModal
        id={server.id}
        type={PermissionsIdType.McpServer}
        bindings={server}
        header="MCP server permissions"
        refetch={refetch}
        open={showPermissions}
        onClose={() => setShowPermissions(false)}
      />
    </>
  )
}

function ViewAction({
  server,
  removeServer,
  loading,
}: {
  server: McpServerFragment
  removeServer?: (server: McpServerFragment) => void
  loading?: boolean
}) {
  const onDisconnect = removeServer ? () => removeServer(server) : undefined
  return (
    <ViewMcpServerDetails
      server={server}
      onDisconnect={onDisconnect}
      loading={loading}
    />
  )
}

function RemoveConnectionAction({
  server,
  removeServer,
  loading,
}: {
  server: McpServerFragment
  removeServer?: (server: McpServerFragment) => void
  loading?: boolean
}) {
  const onDisconnect = removeServer ? () => removeServer(server) : undefined
  if (!onDisconnect) return null
  return (
    <IconFrame
      clickable
      disabled={loading}
      icon={loading ? <Spinner /> : <TrashCanIcon />}
      tooltip="Remove connection"
      onClick={onDisconnect}
    />
  )
}
