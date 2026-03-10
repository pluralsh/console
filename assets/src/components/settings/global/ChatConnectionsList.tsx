import {
  Button,
  Flex,
  Input,
  PencilIcon,
  SearchIcon,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useState, useMemo } from 'react'

import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { SimpleToastChip } from 'components/utils/SimpleToastChip'
import { Body2BoldP } from 'components/utils/typography/Text'
import { Confirm } from 'components/utils/Confirm'
import { DeleteIconButton } from 'components/utils/IconButtons'
import { Info } from 'components/utils/Info'
import { useThrottle } from 'components/hooks/useThrottle'

import {
  ChatProviderConnection,
  ChatProviderConnectionType,
  useChatProviderConnectionsQuery,
  useDeleteChatProviderConnectionMutation,
} from 'generated/graphql'

import { mapExistingNodes } from 'utils/graphql'

import { ListWrapperSC } from '../usermanagement/users/UsersList'

import {
  CHAT_CONNECTION_CREATE_ID_KEY,
  ChatConnectionEditT,
} from './GlobalSettingsChatConnections'

export type ChatConnectionsListMeta = {
  setConnectionEdit: (connection: ChatConnectionEditT | null) => void
  setConnectionDeletedToast: (show: boolean, name: string) => void
}

const columnHelper = createColumnHelper<ChatProviderConnection>()

const chatProviderConnectionTypeToLabel: Record<
  ChatProviderConnectionType,
  string
> = {
  [ChatProviderConnectionType.Slack]: 'Slack',
  [ChatProviderConnectionType.Teams]: 'Microsoft Teams',
}

const ColConnectionInfo = columnHelper.accessor((connection) => connection, {
  id: 'info',
  meta: { gridTemplate: '1fr' },
  cell: function Cell({ getValue }) {
    const connection = getValue()

    return (
      <Info
        text={connection?.name}
        description={
          connection
            ? `${chatProviderConnectionTypeToLabel[connection.type]} connection`
            : ''
        }
      />
    )
  },
})

const ColActions = columnHelper.accessor((connection) => connection, {
  id: 'actions',
  cell: function Cell({ getValue, table: { options } }) {
    const connection = getValue()
    const { setConnectionDeletedToast, setConnectionEdit } =
      options.meta as ChatConnectionsListMeta

    const [dialogKey, setDialogKey] = useState<'confirmDelete' | ''>('')

    const [deleteConnection, { loading, error }] =
      useDeleteChatProviderConnectionMutation({
        variables: { id: connection.id },
        onCompleted: () => {
          setConnectionDeletedToast(true, connection.name)
          setDialogKey('')
        },
        refetchQueries: ['ChatProviderConnections'],
        awaitRefetchQueries: true,
      })

    return (
      <>
        <Flex gap="xsmall">
          <Button
            tertiary
            startIcon={<PencilIcon />}
            onClick={() => setConnectionEdit(connection)}
          >
            Edit
          </Button>
          <DeleteIconButton onClick={() => setDialogKey('confirmDelete')} />
        </Flex>
        <Confirm
          open={dialogKey === 'confirmDelete'}
          text={
            <>
              Are you sure you want to delete the <b>{connection.name}</b> chat
              connection?
            </>
          }
          close={() => setDialogKey('')}
          label="Delete chat connection"
          submit={() => deleteConnection()}
          loading={loading}
          destructive
          error={error}
        />
      </>
    )
  },
})

const columns = [ColConnectionInfo, ColActions]

export function ChatConnectionsList({
  setConnectionEdit,
}: {
  setConnectionEdit: (connection: ChatConnectionEditT | null) => void
}) {
  const [deletedToast, setDeletedToast] = useState<{
    show: boolean
    name: string
  }>({ show: false, name: '' })

  const [q, setQ] = useState('')
  const throttledQ = useThrottle(q, 300)

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useChatProviderConnectionsQuery,
        keyPath: ['chatProviderConnections'],
      },
      { q: throttledQ }
    )

  const connections = useMemo(
    () => mapExistingNodes(data?.chatProviderConnections),
    [data?.chatProviderConnections]
  )

  const meta: ChatConnectionsListMeta = {
    setConnectionEdit,
    setConnectionDeletedToast: (show, name) => setDeletedToast({ show, name }),
  }

  if (error) return <GqlError error={error} />

  return (
    <ListWrapperSC>
      <Input
        value={q}
        placeholder="Search chat connections"
        startIcon={<SearchIcon color="text-light" />}
        onChange={({ target: { value } }) => setQ(value)}
        background="fill-zero"
        flexShrink={0}
      />
      <Table
        hideHeader
        fullHeightWrap
        virtualizeRows
        rowBg="base"
        data={connections}
        loading={!data && loading}
        columns={columns}
        reactTableOptions={{ meta }}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        emptyStateProps={{
          ...(!throttledQ
            ? {
                message: "Looks like you don't have any chat connections yet.",
                children: (
                  <Button
                    floating
                    onClick={() =>
                      setConnectionEdit(CHAT_CONNECTION_CREATE_ID_KEY)
                    }
                  >
                    Add chat connection
                  </Button>
                ),
              }
            : { message: `No chat connections found for ${throttledQ}` }),
        }}
      />
      <SimpleToastChip
        show={deletedToast.show}
        delayTimeout={2500}
        onClose={() => setDeletedToast({ show: false, name: '' })}
      >
        {deletedToast.name}{' '}
        <Body2BoldP $color="icon-danger">deleted</Body2BoldP>
      </SimpleToastChip>
    </ListWrapperSC>
  )
}
