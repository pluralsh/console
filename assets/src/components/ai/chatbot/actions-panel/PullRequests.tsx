import {
  PullRequestFragment,
  useChatAgentSessionPRsQuery,
} from '../../../../generated/graphql.ts'
import {
  AccordionItem,
  ChecklistIcon,
  Flex,
  IconFrame,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../../../utils/table/useFetchPaginatedData.tsx'
import { useMemo } from 'react'
import { mapExistingNodes } from '../../../../utils/graphql.ts'
import { isEmpty } from 'lodash'
import { ActionItemHeaderSC } from './ChatbotActionsPanel.tsx'

export function PullRequests({ currentThreadId }: { currentThreadId: string }) {
  const { data, loading, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useChatAgentSessionPRsQuery,
        keyPath: ['chatThread', 'session', 'pullRequests'],
      },
      { id: currentThreadId }
    )

  const pullRequests = useMemo(
    () => mapExistingNodes(data?.chatThread?.session?.pullRequests),
    [data?.chatThread?.session?.pullRequests]
  )

  if (isEmpty(pullRequests)) return null

  return (
    <AccordionItem
      key="prs"
      value="prs"
      trigger={
        <ActionItemHeaderSC>
          <IconFrame
            icon={<ChecklistIcon />}
            size="small"
          />
          Pull requests
        </ActionItemHeaderSC>
      }
    >
      <Table
        hideHeader
        rowBg="raised"
        fullHeightWrap
        virtualizeRows
        data={pullRequests}
        columns={columns}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      />
    </AccordionItem>
  )
}

const columnHelper = createColumnHelper<PullRequestFragment>()

const columns = [
  columnHelper.accessor((pullRequest) => pullRequest, {
    id: 'row',
    cell: function Cell({ getValue }) {
      const pullRequest = getValue()

      return (
        <Flex
          align="center"
          gap="xsmall"
        >
          {pullRequest.title}
        </Flex>
      )
    },
  }),
]
