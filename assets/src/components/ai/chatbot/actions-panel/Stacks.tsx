import {
  StackTinyFragment,
  useChatAgentSessionStacksQuery,
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

export function Stacks({ currentThreadId }: { currentThreadId: string }) {
  const { data, loading, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useChatAgentSessionStacksQuery,
        keyPath: ['chatThread', 'session', 'stacks'],
      },
      { id: currentThreadId }
    )

  const stacks = useMemo(
    () => mapExistingNodes(data?.chatThread?.session?.stacks),
    [data?.chatThread?.session?.stacks]
  )

  if (isEmpty(stacks)) return null

  return (
    <AccordionItem
      key="stacks"
      value="stacks"
      trigger={
        <ActionItemHeaderSC>
          <IconFrame
            icon={<ChecklistIcon />}
            size="small"
          />
          Stacks
        </ActionItemHeaderSC>
      }
    >
      <Table
        hideHeader
        rowBg="raised"
        fullHeightWrap
        virtualizeRows
        data={stacks}
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

const columnHelper = createColumnHelper<StackTinyFragment>()

const columns = [
  columnHelper.accessor((stack) => stack, {
    id: 'row',
    cell: function Cell({ getValue }) {
      const stack = getValue()

      return (
        <Flex
          align="center"
          gap="xsmall"
        >
          {stack.name}
        </Flex>
      )
    },
  }),
]
