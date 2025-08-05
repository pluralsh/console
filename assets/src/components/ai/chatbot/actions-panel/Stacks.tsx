import {
  ChatAgentSessionStacksQuery,
  StackChatFragment,
} from '../../../../generated/graphql.ts'
import {
  AccordionItem,
  ChecklistIcon,
  Flex,
  IconFrame,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  FetchPaginatedDataResult,
} from '../../../utils/table/useFetchPaginatedData.tsx'
import { isEmpty } from 'lodash'
import { ActionItemHeaderSC } from './ChatbotActionsPanel.tsx'
import { useTheme } from 'styled-components'
import { Body2P, CaptionP } from '../../../utils/typography/Text.tsx'
import { TRUNCATE } from '../../../utils/truncate.ts'
import { AiInsightSummaryIcon } from '../../../utils/AiInsights.tsx'
import { StackTypeIcon } from '../../../stacks/common/StackTypeIcon.tsx'
import StackStatusChip from '../../../stacks/common/StackStatusChip.tsx'
import { getStacksAbsPath } from '../../../../routes/stacksRoutesConsts.tsx'
import { useNavigate } from 'react-router-dom'

export function Stacks({
  stacks,
  query,
}: {
  stacks: StackChatFragment[]
  query: FetchPaginatedDataResult<ChatAgentSessionStacksQuery>
}) {
  const navigate = useNavigate()

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
        onRowClick={(_e, { original }: Row<StackChatFragment>) =>
          navigate(getStacksAbsPath(original.id))
        }
        hasNextPage={query.pageInfo?.hasNextPage}
        fetchNextPage={query.fetchNextPage}
        isFetchingNextPage={query.loading}
        onVirtualSliceChange={query.setVirtualSlice}
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
