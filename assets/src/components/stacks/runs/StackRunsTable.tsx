import {
  StackRunFragment,
  StackRunsQuery,
  StackRunsQueryVariables,
  useStackRunsQuery,
} from 'generated/graphql'

import { mapExistingNodes } from 'utils/graphql'

import { useMemo } from 'react'

import {
  CaretRightIcon,
  Flex,
  GitCommitIcon,
  IconFrame,
  Table,
  TableProps,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext'
import { AiInsightSummaryIcon } from 'components/utils/AiInsights'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import {
  FetchPaginatedDataOptions,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import {
  getStackRunsAbsPath,
  STACK_RUNS_INSIGHTS_REL_PATH,
} from 'routes/stacksRoutesConsts'
import { fromNow } from 'utils/datetime'
import StackRunIcon from '../common/StackRunIcon'
import StackStatusChip from '../common/StackStatusChip'
import { StackOutletContextT } from '../Stacks'

export function StackRunsTable({
  variables,
  options,
  ...props
}: {
  variables: StackRunsQueryVariables
  options: Omit<
    FetchPaginatedDataOptions<StackRunsQuery, StackRunsQueryVariables>,
    'queryHook' | 'keyPath'
  >
} & Omit<TableProps, 'data' | 'columns'>) {
  const { stackId } = useParams()
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useStackRunsQuery,
        keyPath: ['infrastructureStack', 'runs'],
        ...options,
      },
      variables
    )

  const runs = useMemo(
    () => mapExistingNodes(data?.infrastructureStack?.runs),
    [data?.infrastructureStack?.runs]
  )

  if (error) return <GqlError error={error} />

  return (
    <Table
      loose
      rowBg="base"
      fillLevel={1}
      hideHeader
      fullHeightWrap
      virtualizeRows
      data={runs}
      loading={!data && loading}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      columns={cols}
      getRowLink={({ original }) => {
        const { id } = original as StackRunFragment
        return <Link to={getStackRunsAbsPath(stackId, id)} />
      }}
      {...props}
    />
  )
}

const columnHelper = createColumnHelper<StackRunFragment>()

const cols = [
  columnHelper.accessor((run) => run, {
    id: 'name',
    meta: { gridTemplate: '1fr' },
    cell: function Cell({ getValue }) {
      const { stack } = useOutletContext<Nullable<StackOutletContextT>>() ?? {}
      const { id, message, approver, status, git } = getValue()
      return (
        <StackedText
          icon={
            <StackRunIcon
              css={{ width: 'fit-content' }}
              status={status}
              deleting={stack?.deleteRun?.id === id}
            />
          }
          first={
            <Flex
              gap="small"
              align="center"
              tooltip={{
                placement: 'top-start',
                label: message ?? 'No message',
              }}
            >
              <Body2BoldP $color="text">{message ?? 'No message'}</Body2BoldP>
              {approver && (
                <CaptionP
                  $color="text-xlight"
                  as="span"
                >
                  approved by {approver?.name}
                </CaptionP>
              )}
            </Flex>
          }
          second={
            <Flex gap="xsmall">
              <GitCommitIcon />
              {git.ref}
            </Flex>
          }
          secondPartialType="caption"
        />
      )
    },
  }),
  columnHelper.accessor((run) => run, {
    id: 'status',
    cell: function Cell({ getValue }) {
      const { id, insight, status, insertedAt } = getValue()
      const { ai } = useDeploymentSettings()
      const { stackId } = useParams()
      return (
        <Flex
          gap="small"
          align="center"
          alignSelf="end"
        >
          <CaptionP $color="text-xlight">{fromNow(insertedAt)}</CaptionP>
          {ai?.enabled && (
            <AiInsightSummaryIcon
              navPath={`${getStackRunsAbsPath(stackId, id)}/${STACK_RUNS_INSIGHTS_REL_PATH}`}
              insight={insight}
            />
          )}
          <StackStatusChip status={status} />
        </Flex>
      )
    },
  }),
  columnHelper.display({
    id: 'actions',
    cell: function Cell() {
      return <IconFrame icon={<CaretRightIcon />} />
    },
  }),
]
