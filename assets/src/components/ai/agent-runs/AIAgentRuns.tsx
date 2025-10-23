import { Chip, ChipSeverity, Flex, Table } from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  AgentRunFragment,
  AgentRunStatus,
  useAgentRunsQuery,
} from 'generated/graphql'
import { capitalize, truncate } from 'lodash'
import { useMemo, useState } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { AIAgentRuntimesSelector } from './AIAgentRuntimesSelector'
import { CreateAgentRunButton } from './CreateAgentRun'
import { isNonNullable } from 'utils/isNonNullable'
import { AI_AGENT_RUNS_ABS_PATH } from 'routes/aiRoutesConsts'
import { useNavigate } from 'react-router-dom'

export function AIAgentRuns() {
  const navigate = useNavigate()
  const [selectedRuntimeId, setSelectedRuntimeId] = useState<Nullable<string>>()
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useAgentRunsQuery, keyPath: ['agentRuns'] },
      { runtimeId: selectedRuntimeId }
    )

  const runs = useMemo(
    () => mapExistingNodes(data?.agentRuns),
    [data?.agentRuns]
  )

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="medium"
      minHeight={0}
    >
      <StretchedFlex>
        <AIAgentRuntimesSelector
          allowDeselect
          setSelectedRuntimeId={setSelectedRuntimeId}
        />
        <CreateAgentRunButton />
      </StretchedFlex>
      <Table
        fullHeightWrap
        virtualizeRows
        data={runs}
        columns={runsTableCols}
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

const columnHelper = createColumnHelper<AgentRunFragment>()

const runsTableCols = [
  columnHelper.accessor((run) => truncate(run.prompt, { length: 60 }), {
    id: 'prompt',
    header: 'Prompt',
  }),
  columnHelper.accessor((run) => run.runtime?.name ?? '', {
    id: 'runtime',
    header: 'Runtime',
  }),
  columnHelper.accessor((run) => run.status, {
    id: 'status',
    header: 'Status',
    enableSorting: true,
    cell: ({ getValue }) => (
      <Chip severity={agentRunStatusToSeverity[getValue()]}>
        {capitalize(getValue())}
      </Chip>
    ),
  }),
  columnHelper.accessor((run) => run.mode, {
    id: 'mode',
    header: 'Mode',
    enableSorting: true,
    cell: ({ getValue }) => (
      <Chip severity="info">{capitalize(getValue())}</Chip>
    ),
  }),
  columnHelper.accessor((run) => run.shared, {
    id: 'shared',
    header: 'Shared',
    enableSorting: true,
    cell: ({ getValue }) => (getValue() ? 'Yes' : 'No'),
  }),
  columnHelper.accessor(
    (run) => `${run.repository}${run.branch ? `@${run.branch}` : ''}`,
    {
      id: 'repo',
      header: 'Repository',
      enableSorting: true,
    }
  ),
  columnHelper.accessor((run) => run.pullRequests, {
    id: 'pullRequests',
    header: 'Pull Requests',
    cell: ({ getValue }) => (
      <Flex gap="xsmall">
        {getValue()
          ?.filter(isNonNullable)
          .map((pr) => <Chip key={pr.id}>{pr.title}</Chip>) ?? []}
      </Flex>
    ),
  }),
]

export const agentRunStatusToSeverity: Record<AgentRunStatus, ChipSeverity> = {
  [AgentRunStatus.Successful]: 'success',
  [AgentRunStatus.Running]: 'info',
  [AgentRunStatus.Pending]: 'info',
  [AgentRunStatus.Failed]: 'danger',
  [AgentRunStatus.Cancelled]: 'neutral',
}
