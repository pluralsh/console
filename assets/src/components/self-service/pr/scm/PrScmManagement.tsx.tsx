import { Flex, Table } from '@pluralsh/design-system'

import { useScmConnectionsQuery, useScmWebhooksQuery } from 'generated/graphql'

import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'

import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'

import { CreateScmConnection } from './CreateScmConnection'
import { columns as connectionsColumns } from './PrScmConnectionsColumns'
import { columns as webhooksColumns } from './ScmWebhooksColumns'
import { SetupDependencyAutomation } from './SetupDependencyAutomation'

export const PR_QUERY_PAGE_SIZE = 100

export function ScmManagement() {
  const connectionsQ = useFetchPaginatedData({
    queryHook: useScmConnectionsQuery,
    keyPath: ['scmConnections'],
  })

  const webhooksQ = useFetchPaginatedData({
    queryHook: useScmWebhooksQuery,
    keyPath: ['scmWebhooks'],
  })

  useSetPageHeaderContent(
    <Flex gap="small">
      <SetupDependencyAutomation refetch={connectionsQ.refetch} />
      <CreateScmConnection refetch={connectionsQ.refetch} />
      <div>webhooks action</div>
    </Flex>
  )

  return (
    <Flex
      direction="column"
      gap="small"
      height="100%"
    >
      {connectionsQ.error ? (
        <GqlError error={connectionsQ.error} />
      ) : (
        <Table
          fullHeightWrap
          columns={columns}
          loading={!connectionsQ.data && connectionsQ.loading}
          reactTableOptions={{ meta: { refetch: connectionsQ.refetch } }}
          reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
          data={connectionsQ.data?.scmConnections?.edges || []}
          virtualizeRows
          hasNextPage={connectionsQ.pageInfo?.hasNextPage}
          fetchNextPage={connectionsQ.fetchNextPage}
          isFetchingNextPage={connectionsQ.loading}
          onVirtualSliceChange={connectionsQ.setVirtualSlice}
        />
      )}
      {webhooksQ.error ? (
        <GqlError error={webhooksQ.error} />
      ) : (
        <Table
          fullHeightWrap
          columns={columns}
          loading={!webhooksQ.data && webhooksQ.loading}
          reactTableOptions={{ meta: { refetch: webhooksQ.refetch } }}
          reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
          data={webhooksQ.data?.scmWebhooks?.edges || []}
          virtualizeRows
          hasNextPage={webhooksQ.pageInfo?.hasNextPage}
          fetchNextPage={webhooksQ.fetchNextPage}
          isFetchingNextPage={webhooksQ.loading}
          onVirtualSliceChange={webhooksQ.setVirtualSlice}
        />
      )}
    </Flex>
  )
}
