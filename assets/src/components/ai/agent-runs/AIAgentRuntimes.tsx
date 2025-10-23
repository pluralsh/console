import { Flex, Table } from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  AgentRunFragment,
  AgentRuntimeFragment,
  useAgentRuntimesQuery,
} from 'generated/graphql'
import { truncate } from 'lodash'
import { useMemo } from 'react'
import { mapExistingNodes } from 'utils/graphql'

import { AI_AGENT_RUNS_ABS_PATH } from 'routes/aiRoutesConsts'
import { useNavigate } from 'react-router-dom'

export function AIAgentRuntimes() {
  const navigate = useNavigate()
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useAgentRuntimesQuery, keyPath: ['agentRuntimes'] },
      {}
    )

  const runtimes = useMemo(
    () => mapExistingNodes(data?.agentRuntimes),
    [data?.agentRuntimes]
  )

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="medium"
      minHeight={0}
    >
      <Table
        fullHeightWrap
        virtualizeRows
        data={runtimes}
        columns={columns}
        loading={!data && loading}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        emptyStateProps={{ message: 'No runs found.' }}
        onRowClick={(_e, { original }: Row<AgentRunFragment>) => {
          if (original.id) navigate(`${AI_AGENT_RUNS_ABS_PATH}/${original.id}`)
        }}
      />
    </Flex>
  )
}

const columnHelper = createColumnHelper<AgentRuntimeFragment>()

const columns = [
  columnHelper.accessor((runtime) => truncate(runtime.name, { length: 60 }), {
    id: 'name',
    header: 'Name',
  }),
  columnHelper.accessor((runtime) => (runtime.default ? 'Default' : ''), {
    id: 'default',
    header: 'Default',
  }),
  columnHelper.accessor((runtime) => (runtime.aiProxy ? 'Enabled' : ''), {
    id: 'aiProxy',
    header: 'AI Proxy',
  }),
]
