import { Button, ButtonProps, Table } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useChatProviderConnectionsQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CHATBOTS_SETTINGS_CREATE_ABS_PATH } from 'routes/settingsRoutesConst'
import { mapExistingNodes } from 'utils/graphql'
import { getChatbotColumns } from './ChatbotsColumns'

const CHATBOTS_PAGE_SIZE = 25
const CHATBOTS_POLLING_INTERVAL = 10_000

export function ChatbotsList() {
  const {
    data,
    loading,
    error,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
    refetch,
  } = useFetchPaginatedData({
    queryHook: useChatProviderConnectionsQuery,
    keyPath: ['chatProviderConnections'],
    pageSize: CHATBOTS_PAGE_SIZE,
    fetchPolicy: 'cache-and-network',
    pollInterval: CHATBOTS_POLLING_INTERVAL,
  })

  const chatbots = useMemo(
    () => mapExistingNodes(data?.chatProviderConnections),
    [data?.chatProviderConnections]
  )
  const columns = useMemo(() => getChatbotColumns({ refetch }), [refetch])

  if (error) return <GqlError error={error} />

  return (
    <Table
      hideHeader
      loose
      fullHeightWrap
      virtualizeRows
      data={chatbots}
      columns={columns}
      loading={loading && !data}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      emptyStateProps={{
        message: 'No chatbots found.',
        children: <AddChatbotButton />,
      }}
    />
  )
}

export function AddChatbotButton({
  buttonProps,
}: {
  buttonProps?: ButtonProps
}) {
  return (
    <Button
      as={Link}
      to={CHATBOTS_SETTINGS_CREATE_ABS_PATH}
      height="fit-content"
      {...buttonProps}
    >
      Add chatbot
    </Button>
  )
}
