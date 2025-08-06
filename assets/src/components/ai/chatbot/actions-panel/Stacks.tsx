import {
  AccordionItem,
  Flex,
  IconFrame,
  StackIcon,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { isEmpty } from 'lodash'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { StackChatFragment } from '../../../../generated/graphql.ts'
import { getStacksAbsPath } from '../../../../routes/stacksRoutesConsts.tsx'
import StackStatusChip from '../../../stacks/common/StackStatusChip.tsx'
import { StackTypeIcon } from '../../../stacks/common/StackTypeIcon.tsx'
import { AiInsightSummaryIcon } from '../../../utils/AiInsights.tsx'
import { TRUNCATE } from '../../../utils/truncate.ts'
import { Body2P, CaptionP } from '../../../utils/typography/Text.tsx'
import { ActionItemHeaderSC } from './ChatbotActionsPanel.tsx'

export function Stacks({ stacks }: { stacks: StackChatFragment[] }) {
  const navigate = useNavigate()

  if (isEmpty(stacks)) return null

  return (
    <AccordionItem
      key="stacks"
      value="stacks"
      trigger={
        <ActionItemHeaderSC>
          <IconFrame
            icon={<StackIcon />}
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
