import {
  AppIcon,
  Card,
  CaretRightIcon,
  Flex,
  Markdown,
  PaperCheckIcon,
  PrClosedIcon,
  PrMergedIcon,
  PrOpenIcon,
  Table,
  Tooltip,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { RunStatusIcon } from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { PRsModalIcon } from 'components/ai/agent-runs/AIAgentRunsTableCols'
import { GqlError } from 'components/utils/Alert'
import {
  VirtualSlice,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import { CaptionP } from 'components/utils/typography/Text'
import {
  PageInfoFragment,
  PrStatus,
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
    <WorkbenchJobsTableContent
      jobs={jobs}
      loading={loading}
      loaded={!!data}
      pageInfo={pageInfo}
      fetchNextPage={fetchNextPage}
      setVirtualSlice={setVirtualSlice}
    />
  )
}

export function WorkbenchJobsTableContent({
  jobs,
  loading,
  loaded,
  pageInfo,
  fetchNextPage,
  setVirtualSlice,
}: {
  jobs: WorkbenchJobTinyFragment[]
  loading: boolean
  loaded: boolean
  pageInfo: PageInfoFragment | undefined
  fetchNextPage: () => void
  setVirtualSlice: (slice: VirtualSlice) => void
}) {
  return (
    <Table
      hideHeader
      fullHeightWrap
      virtualizeRows
      data={jobs}
      columns={columns}
      loading={!loaded && loading}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      emptyStateProps={{ message: 'No jobs found.' }}
      getRowLink={({ original }) => {
        const { id: jobId, workbench } = original as WorkbenchJobTinyFragment
        return (
          <Link
            to={getWorkbenchJobAbsPath({
              workbenchId: workbench?.id ?? '',
              jobId,
            })}
          />
        )
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
  columnHelper.accessor(({ user }) => user, {
    id: 'creator',
    cell: ({ getValue }) => {
      const user = getValue()
      if (!user?.name) return null

      return (
        <Tooltip label={user.name}>
          <AppIcon
            url={user.profile ?? undefined}
            name={user.name}
            size="xxsmall"
            spacing="none"
            css={{ borderRadius: '50%' }}
          />
        </Tooltip>
      )
    },
  }),
  columnHelper.accessor((job) => job, {
    id: 'actions',
    cell: function Cell({ getValue }) {
      const theme = useTheme()
      const { spacing } = theme
      const { pullRequests, result, status } = getValue()
      const prs = pullRequests?.filter(isNonNullable) ?? []
      const singlePrProps =
        prs.length === 1
          ? (() => {
              const singlePrStatus = prs[0].status
              const icon =
                singlePrStatus === PrStatus.Merged ? (
                  <PrMergedIcon color={theme.colors['code-block-purple']} />
                ) : singlePrStatus === PrStatus.Closed ? (
                  <PrClosedIcon color="icon-danger" />
                ) : (
                  <PrOpenIcon color="icon-success" />
                )
              const tooltip =
                singlePrStatus === PrStatus.Merged
                  ? 'View merged pull request'
                  : singlePrStatus === PrStatus.Closed
                    ? 'View closed pull request'
                    : 'View open pull request'
              return { icon, tooltip }
            })()
          : null

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
            prs={prs}
            {...(singlePrProps ?? {})}
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
