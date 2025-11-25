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
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import {
  FetchPaginatedDataOptions,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { getStackRunsAbsPath } from 'routes/stacksRoutesConsts'
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
      emptyStateProps={{ message: 'No runs found.' }}
      {...props}
    />
  )
}

const columnHelper = createColumnHelper<StackRunFragment>()

const cols = [
  columnHelper.accessor((run) => run, {
    id: 'name',
    meta: { truncate: true },
    cell: function Cell({ getValue }) {
      const { stack } = useOutletContext<Nullable<StackOutletContextT>>() ?? {}
      const { id, message, status, git } = getValue()
      return (
        <StackedText
          icon={
            <StackRunIcon
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
            </Flex>
          }
          second={
            <Flex gap="xsmall">
              <GitCommitIcon />
              <span>{git.ref}</span>
            </Flex>
          }
          secondPartialType="caption"
        />
      )
    },
  }),
  columnHelper.accessor((run) => run.insertedAt, {
    id: 'insertedAt',
    cell: function Cell({ getValue }) {
      return <CaptionP $color="text-xlight">{fromNow(getValue())}</CaptionP>
    },
  }),
  columnHelper.accessor((run) => run, {
    id: 'status',
    cell: function Cell({ getValue }) {
      const { id, insight, status } = getValue()
      const { stackId = '' } = useParams()

      return (
        <Flex
          gap="xsmall"
          align="center"
          alignSelf="end"
        >
          <StackStatusChip
            css={{ alignSelf: 'end' }}
            status={status}
            insight={insight}
            stackId={stackId}
            runId={id}
          />
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
