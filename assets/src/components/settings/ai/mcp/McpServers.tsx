import {
  ArrowTopRightIcon,
  Button,
  Flex,
  FormField,
  Modal,
  Table,
  Toast,
} from '@pluralsh/design-system'
import { FLOW_DOCS_URL } from 'components/flows/Flows'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  useGenerateMcpTokenLazyQuery,
  useMcpServersQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import {
  ColActions,
  ColConfirm,
  ColInfo,
  McpTableAction,
} from './McpServerTableCols'
import { InputRevealer } from 'components/cd/providers/InputRevealer'

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
  } = useFetchPaginatedData({
    queryHook: useMcpServersQuery,
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
  if (error) return <GqlError error={error} />

  return (
    <WrapperSC>
      {tokenError && <GqlError error={tokenError} />}
      <Flex justifyContent="space-between">
        <StackedText
          first="MCP servers"
          firstPartialType="body2Bold"
          firstColor="text"
          second="Add and manage MCP servers to be connected to Flows and AI chats."
          secondPartialType="body2"
          secondColor="text-light"
        />
        <Flex gap="small">
          <Button
            secondary
            as="a"
            href={FLOW_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<ArrowTopRightIcon />}
          >
            Add via CRD
          </Button>
          <Button
            floating
            loading={generatingToken}
            onClick={() => generateToken()}
          >
            Generate JWT
          </Button>
        </Flex>
      </Flex>
      <Table
        fullHeightWrap
        virtualizeRows
        fillLevel={1}
        hideHeader
        rowBg="base"
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
  overflow: 'hidden',
  height: '100%',
  gap: theme.spacing.medium,
}))

const cols = [ColInfo, ColConfirm, ColActions]
const actions: McpTableAction[] = ['audit', 'permissions', 'view']
