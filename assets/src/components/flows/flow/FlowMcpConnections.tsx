import {
  ArrowTopRightIcon,
  Button,
  Flex,
  ServersIcon,
  Table,
} from '@pluralsh/design-system'
import { EmptyStateCompact } from 'components/ai/AIThreads'
import {
  ColActions,
  ColConfirm,
  ColInfo,
  McpTableAction,
} from 'components/ai/mcp/McpServerTableCols'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import {
  FlowBasicFragment,
  McpServerAssociationAttributes,
  McpServerFragment,
  useFlowMcpServersQuery,
  useUpsertFlowMutation,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { AI_MCP_SERVERS_ABS_PATH } from 'routes/aiRoutesConsts'
import { isNonNullable } from 'utils/isNonNullable'
import { FLOW_DOCS_URL } from '../Flows'
import { ChangeMcpConnectionsModal } from './ChangeMcpConnectionsModal'

export function FlowMcpConnections() {
  const { flowId } = useParams()
  const [showConnectionsModal, setShowConnectionsModal] = useState(false)
  const { data, loading, error } = useFlowMcpServersQuery({
    variables: { id: flowId ?? '' },
  })

  const servers = data?.flow?.servers?.filter(isNonNullable) ?? []

  const flow = useOutletContext<FlowBasicFragment | undefined>()

  const [mutation, { loading: mutationLoading, error: mutationError }] =
    useUpsertFlowMutation({
      refetchQueries: ['FlowMcpServers'],
      awaitRefetchQueries: true,
    })

  const serverIds: McpServerAssociationAttributes[] = servers.map(({ id }) => ({
    serverId: id,
  }))

  const addServer = (server: McpServerFragment, onCompleted?: () => void) => {
    mutation({
      variables: {
        attributes: {
          name: flow?.name ?? '',
          serverAssociations: [...serverIds, { serverId: server.id }],
        },
      },
      onCompleted,
    })
  }

  const removeServer = (server: McpServerFragment) =>
    mutation({
      variables: {
        attributes: {
          name: flow?.name ?? '',
          serverAssociations: serverIds.filter(
            ({ serverId }) => serverId !== server.id
          ),
        },
      },
    })

  useSetPageHeaderContent(
    <Flex gap="small">
      <Button
        secondary
        as={Link}
        to={AI_MCP_SERVERS_ABS_PATH}
      >
        View all MCP servers
      </Button>
      <Button
        secondary
        onClick={() => setShowConnectionsModal(true)}
      >
        Change MCP connections
      </Button>
    </Flex>
  )

  if (error) return <GqlError error={error} />

  return (
    <>
      {isEmpty(servers) && !loading ? (
        <FlowMcpConnectionsEmptyState
          onClick={() => setShowConnectionsModal(true)}
        />
      ) : (
        <Table
          hideHeader
          fillLevel={1}
          rowBg="base"
          data={servers}
          columns={cols}
          loading={isEmpty(servers) && loading}
          reactTableOptions={{
            meta: { removeServer, loading: mutationLoading, actions },
          }}
        />
      )}
      <ChangeMcpConnectionsModal
        servers={servers}
        addServer={addServer}
        removeServer={removeServer}
        serversLoading={loading}
        mutationLoading={mutationLoading}
        error={mutationError}
        open={showConnectionsModal}
        onClose={() => setShowConnectionsModal(false)}
      />
    </>
  )
}

function FlowMcpConnectionsEmptyState({ onClick }: { onClick: () => void }) {
  return (
    <EmptyStateCompact
      message="You do not have any MCP server connections yet"
      description="You can connect your first one from existing MCP servers, or create a new server."
      cssProps={{ height: 'fit-content' }}
      icon={
        <ServersIcon
          color="icon-primary"
          size={32}
        />
      }
    >
      <Flex gap="small">
        <Button
          as="a"
          floating
          href={FLOW_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<ArrowTopRightIcon />}
        >
          Read docs
        </Button>
        <Button onClick={onClick}>Connect MCP server</Button>
      </Flex>
    </EmptyStateCompact>
  )
}

const cols = [ColInfo, ColConfirm, ColActions]
const actions: McpTableAction[] = ['view']
