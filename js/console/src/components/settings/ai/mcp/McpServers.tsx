import {
  ArrowTopRightIcon,
  Button,
  Flex,
  FormField,
  Modal,
  Table,
  Toast,
} from '@pluralsh/design-system'
import { InputRevealer } from 'components/cd/providers/InputRevealer'
import { PageToolbarPortal } from 'components/layout/PageToolbar'
import { SettingsDescription } from 'components/settings/Settings'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  useGenerateMcpTokenLazyQuery,
  McpServersDocument,
  McpServersQuery,
  McpServersQueryVariables,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import {
  ColActions,
  ColConfirm,
  ColInfo,
  McpTableAction,
} from './McpServerTableCols'

export const MCP_DOCS_URL = 'http://docs.plural.sh/plural-features/flows/mcp'

export function McpServers() {
  const [showJwtModal, setShowJwtModal] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const {
    data,
    loading,
    error,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
    refetch,
  } = useFetchPaginatedData<McpServersQuery, McpServersQueryVariables>({
    query: McpServersDocument,
    keyPath: ['mcpServers'],
  })

  const [
    generateToken,
    { data: token, loading: generatingToken, error: tokenError },
  ] = useGenerateMcpTokenLazyQuery({
    onCompleted: () => setShowJwtModal(true),
    fetchPolicy: 'network-only',
  })

  const mcpServers = useMemo(() => mapExistingNodes(data?.mcpServers), [data])

  const toolbarActions = (
    <PageToolbarPortal>
      <Button
        secondary
        small
        as={Link}
        to={MCP_DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        endIcon={<ArrowTopRightIcon />}
      >
        Add via CRD
      </Button>
      <Button
        small
        loading={generatingToken}
        onClick={() => generateToken()}
      >
        Generate JWT
      </Button>
    </PageToolbarPortal>
  )

  if (error)
    return (
      <>
        {toolbarActions}
        <GqlError error={error} />
      </>
    )

  return (
    <WrapperSC>
      {toolbarActions}
      <SettingsDescription>
        Add and manage MCP servers to be connected to Flows and AI chats.
      </SettingsDescription>
      {tokenError && <GqlError error={tokenError} />}
      <Table
        loose
        hideHeader
        fullHeightWrap
        virtualizeRows
        loading={!data && loading}
        data={mcpServers}
        columns={cols}
        reactTableOptions={{ meta: { actions, refetch } }}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        emptyStateProps={{ message: 'No MCP servers found.' }}
      />
      <Modal
        open={showJwtModal}
        onClose={() => setShowJwtModal(false)}
        header="Generate JWT"
        actions={
          <Flex gap="medium">
            <Button
              secondary
              onClick={() => setShowJwtModal(false)}
            >
              Close
            </Button>
            <Button
              onClick={() =>
                navigator.clipboard
                  .writeText(token?.mcpToken ?? '')
                  .then(() => setShowToast(true))
              }
            >
              Copy token
            </Button>
          </Flex>
        }
      >
        <FormField label="JSON web token (JWT)">
          <InputRevealer value={token?.mcpToken ?? ''} />
        </FormField>
      </Modal>
      <Toast
        show={showToast}
        onClose={() => setShowToast(false)}
        closeTimeout={2500}
        severity="success"
        position="bottom"
      >
        JWT copied successfully!
      </Toast>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 678,
  overflow: 'hidden',
  height: '100%',
  gap: theme.spacing.medium,
}))

const cols = [ColInfo, ColConfirm, ColActions]
const actions: McpTableAction[] = ['audit', 'permissions']
