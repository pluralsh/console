import { Flex, Table } from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { SentinelRunFragment, useSentinelRunsQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AI_SENTINELS_RUNS_REL_PATH } from 'routes/aiRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'

export function SentinelRunsTable({ id }: { id: string }) {
  const navigate = useNavigate()
  const { data, error, loading, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useSentinelRunsQuery, keyPath: ['sentinel', 'runs'] },
      { id }
    )
  const runsLoading = !data && loading
  const runs = useMemo(
    () => mapExistingNodes(data?.sentinel?.runs),
    [data?.sentinel?.runs]
  )
  return (
    <Flex
      direction="column"
      gap="xsmall"
    >
      <StackedText
        loading={runsLoading}
        first="Historical runs"
        firstPartialType="body2Bold"
        firstColor="text"
        second="Previous executions of this sentinel"
        secondPartialType="body2"
        secondColor="text-light"
      />
      {error ? (
        <GqlError error={error} />
      ) : (
        <Table
          hideHeader
          rowBg="base"
          fillLevel={1}
          fullHeightWrap
          virtualizeRows
          loading={runsLoading}
          data={runs}
          columns={runsCols}
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onRowClick={(_e, { original }: Row<SentinelRunFragment>) => {
            if (original.id)
              navigate(`${AI_SENTINELS_RUNS_REL_PATH}/${original.id}`)
          }}
          onVirtualSliceChange={setVirtualSlice}
          emptyStateProps={{ message: 'No runs found.' }}
        />
      )}
    </Flex>
  )
}

const columnHelper = createColumnHelper<SentinelRunFragment>()

const ColName = columnHelper.accessor((run) => getRunNameFromId(run.id), {
  id: 'name',
  header: 'Run',
})

const runsCols = [ColName]

export const getRunNameFromId = (id: string) => `run-${id.split('-').shift()}`
