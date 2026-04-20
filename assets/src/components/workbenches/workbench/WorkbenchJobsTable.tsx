import {
  Card,
  CaretRightIcon,
  Flex,
  Markdown,
  PaperCheckIcon,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { RunStatusIcon } from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { PRsModalIcon } from 'components/ai/agent-runs/AIAgentRunsTableCols'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { CaptionP } from 'components/utils/typography/Text'
import {
  WorkbenchJobTinyFragment,
  useWorkbenchJobsQuery,
} from 'generated/graphql'
import { truncate } from 'lodash'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { ActivityModalIcon } from './job/WorkbenchJobActivityResults'

export function WorkbenchJobsTable({ workbenchId }: { workbenchId: string }) {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useWorkbenchJobsQuery, keyPath: ['workbench', 'runs'] },
      { id: workbenchId }
    )
  const jobs = useMemo(() => mapExistingNodes(data?.workbench?.runs), [data])

  if (error) return <GqlError error={error} />

  return (
    <Table
      hideHeader
      fullHeightWrap
      virtualizeRows
      data={jobs}
      columns={columns}
      loading={!data && loading}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      emptyStateProps={{ message: 'No jobs found.' }}
      getRowLink={({ original }) => {
        const { id: jobId } = original as WorkbenchJobTinyFragment
        return <Link to={getWorkbenchJobAbsPath({ workbenchId, jobId })} />
      }}
    />
  )
}

const columnHelper = createColumnHelper<WorkbenchJobTinyFragment>()
const columns = [
  columnHelper.accessor(
    ({ prompt }) => truncate(prompt ?? '', { length: 150 }),
    { id: 'prompt', meta: { gridTemplate: '1fr' } }
  ),
  columnHelper.accessor(({ user }) => user?.name, {
    id: 'creator',
    cell: ({ getValue }) => {
      const name = getValue()
      if (!name) return null
      return <CaptionP $color="text-xlight">{name}</CaptionP>
    },
  }),
  columnHelper.accessor((job) => job, {
    id: 'actions',
    cell: function Cell({ getValue }) {
      const { spacing } = useTheme()
      const { pullRequests, result, status } = getValue()
      return (
        <Flex
          gap="medium"
          align="center"
          justify="flex-end"
          width="100%"
        >
          <PRsModalIcon
            size="small"
            type="tertiary"
            prs={pullRequests?.filter(isNonNullable) ?? []}
          />
          {result?.conclusion && (
            <ActivityModalIcon
              icon={PaperCheckIcon}
              tooltip="View conclusion"
              modalHeader="Conclusion"
              modalContent={
                <Card css={{ padding: spacing.large, overflow: 'auto' }}>
                  <Markdown text={result?.conclusion} />
                </Card>
              }
              size={16}
            />
          )}
          <RunStatusIcon
            fullColor
            status={status}
          />
          <CaretRightIcon color="icon-xlight" />
        </Flex>
      )
    },
  }),
]
