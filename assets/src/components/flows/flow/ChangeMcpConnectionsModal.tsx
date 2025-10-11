import { Button, Card, Flex, Modal, Table } from '@pluralsh/design-system'
import {
  ColActions,
  ColConfirm,
  ColInfo,
  McpTableAction,
} from 'components/ai/mcp/McpServerTableCols'
import { GqlError, GqlErrorType } from 'components/utils/Alert'
import { Body2BoldP } from 'components/utils/typography/Text'
import { McpServerFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { ComponentPropsWithoutRef, useState } from 'react'
import styled from 'styled-components'
import { McpServerSelector } from './McpServerSelector'

export function ChangeMcpConnectionsModal({
  servers,
  addServer,
  removeServer,
  serversLoading,
  mutationLoading,
  error,
  open,
  onClose,
}: {
  servers: McpServerFragment[]
  addServer: (server: McpServerFragment, onCompleted?: () => void) => void
  removeServer: (server: McpServerFragment) => void
  serversLoading: boolean
  mutationLoading: boolean
  error: GqlErrorType
} & ComponentPropsWithoutRef<typeof Modal>) {
  const [isAddingServer, setIsAddingServer] = useState(false)

  return (
    <Modal
      open={open}
      onClose={onClose}
      header="change mcp connections"
      size="large"
      onOpenAutoFocus={(e) => e.preventDefault()}
      actions={
        <Button
          secondary
          onClick={onClose}
        >
          Close
        </Button>
      }
    >
      <Flex
        direction="column"
        gap="medium"
      >
        {error && <GqlError error={error} />}
        {isEmpty(servers) ? (
          <EmptyStateCard>There are no MCP servers added yet.</EmptyStateCard>
        ) : (
          <Table
            hideHeader
            rowBg="base"
            loading={isEmpty(servers) && serversLoading}
            maxHeight={250}
            fillLevel={2}
            data={servers}
            columns={cols}
            reactTableOptions={{
              meta: { removeServer, loading: mutationLoading, actions },
            }}
          />
        )}

        <Flex
          direction="column"
          gap="xsmall"
        >
          <Body2BoldP $color="text">Add MCP server connection</Body2BoldP>
          <McpServerSelector
            fillLevel={2}
            loading={isAddingServer}
            disabled={isAddingServer}
            onServerChange={(server) => {
              setIsAddingServer(true)
              addServer(server, () => setIsAddingServer(false))
            }}
            selectedServers={servers}
            placeholder="Search for an MCP server..."
          />
        </Flex>
      </Flex>
    </Modal>
  )
}

const EmptyStateCard = styled(Card)(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
  textAlign: 'center',
  padding: theme.spacing.xlarge,
}))

const cols = [ColInfo, ColConfirm, ColActions]
const actions: McpTableAction[] = ['view', 'removeConnection']
