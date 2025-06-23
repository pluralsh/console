import { Flex, Table } from '@pluralsh/design-system'

import { useScmConnectionsQuery } from 'generated/graphql'

import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'

import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'

import { CreateScmConnection } from './CreateScmConnection'
import { columns } from './PrScmConnectionsColumns'
import { SetupDependencyAutomation } from './SetupDependencyAutomation'

export const PR_QUERY_PAGE_SIZE = 100

export function ScmManagement() {
  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData({
    queryHook: useScmConnectionsQuery,
    keyPath: ['scmConnections'],
  })

  useSetPageHeaderContent(
    <Flex gap="small">
      <SetupDependencyAutomation refetch={refetch} />
      <CreateScmConnection refetch={refetch} />
    </Flex>
  )

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="small"
      height="100%"
    >
      <div>TODO ADD WEBHOOKS</div>
      <Table
        fullHeightWrap
        columns={columns}
        loading={!data && loading}
        reactTableOptions={{ meta: { refetch } }}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        data={data?.scmConnections?.edges || []}
        virtualizeRows
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
      />
    </Flex>
  )
}
