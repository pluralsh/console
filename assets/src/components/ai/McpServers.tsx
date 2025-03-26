import { ArrowTopRightIcon, Button, Flex, Table } from '@pluralsh/design-system'
import { FLOW_DOCS_URL } from 'components/flows/Flows'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useMcpServersQuery } from 'generated/graphql'
import { useMemo } from 'react'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { mcpServerColsFull } from './McpServerTableCols'

export function McpServers() {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: useMcpServersQuery,
      keyPath: ['mcpServers'],
    })
  const mcpServers = useMemo(() => mapExistingNodes(data?.mcpServers), [data])
  if (error) return <GqlError error={error} />

  return (
    <WrapperSC>
      <Flex justifyContent="space-between">
        <StackedText
          first="MCP servers"
          firstPartialType="body2Bold"
          firstColor="text"
          second="Add and manage MCP servers to be connected to Flows and AI chats."
          secondPartialType="body2"
          secondColor="text-light"
        />
        <Button
          secondary
          as="a"
          href={FLOW_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<ArrowTopRightIcon />}
        >
          Add MCP server via CRD
        </Button>
      </Flex>
      <Table
        fullHeightWrap
        virtualizeRows
        fillLevel={1}
        hideHeader
        rowBg="base"
        loading={!data && loading}
        data={mcpServers}
        columns={mcpServerColsFull}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
      />
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
