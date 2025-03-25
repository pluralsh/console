import { ArrowTopRightIcon, Button, Flex } from '@pluralsh/design-system'
import { FLOW_DOCS_URL } from 'components/flows/Flows'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useMcpServersQuery } from 'generated/graphql'
import styled from 'styled-components'

export function McpServers() {
  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData({
    queryHook: useMcpServersQuery,
    keyPath: ['mcpServer'],
  })
  console.log({ data })
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
      <div>table</div>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  gap: theme.spacing.medium,
}))
