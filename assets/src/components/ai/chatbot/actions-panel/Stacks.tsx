import {
  StackChatFragment,
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
import { useTheme } from 'styled-components'
import { Body2P, CaptionP } from '../../../utils/typography/Text.tsx'
import { TRUNCATE } from '../../../utils/truncate.ts'
import { AiInsightSummaryIcon } from '../../../utils/AiInsights.tsx'
import { StackTypeIcon } from '../../../stacks/common/StackTypeIcon.tsx'
import StackStatusChip from '../../../stacks/common/StackStatusChip.tsx'

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
        rowBg="base"
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

const columnHelper = createColumnHelper<StackChatFragment>()

const columns = [
  columnHelper.accessor((service) => service, {
    id: 'row',
    meta: { gridTemplate: '300' },
    cell: function Cell({ getValue }) {
      const theme = useTheme()
      const stack = getValue()

      return (
        <Flex
          direction="column"
          gap="xsmall"
          padding="xxsmall"
          width="100%"
        >
          <Flex
            align="center"
            gap="xsmall"
            flex={1}
          >
            <IconFrame
              icon={<StackTypeIcon stackType={stack.type} />}
              size="small"
            />
            <Body2P css={{ maxWidth: 140, ...TRUNCATE }}>{stack.name}</Body2P>
            <Flex flex={1} />
            <AiInsightSummaryIcon insight={stack.insight} />
            <StackStatusChip
              size="small"
              status={stack.status}
              deleting={!!stack?.deletedAt}
            />
          </Flex>
          <CaptionP css={{ color: theme.colors['text-xlight'] }}>
            {stack.repository?.url}
          </CaptionP>
        </Flex>
      )
    },
  }),
]
