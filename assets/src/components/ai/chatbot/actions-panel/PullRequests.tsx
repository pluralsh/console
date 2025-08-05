import {
  ChatAgentSessionPRsQuery,
  PullRequestFragment,
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
  FetchPaginatedDataResult,
} from '../../../utils/table/useFetchPaginatedData.tsx'
import { isEmpty } from 'lodash'
import { ActionItemHeaderSC } from './ChatbotActionsPanel.tsx'
import { useTheme } from 'styled-components'
import { Body2P, CaptionP } from '../../../utils/typography/Text.tsx'
import { TRUNCATE } from '../../../utils/truncate.ts'
import { PrStatusChip } from '../../../self-service/pr/queue/PrQueueColumns.tsx'

export function PullRequests({
  prs,
  query,
}: {
  prs: PullRequestFragment[]
  query: FetchPaginatedDataResult<ChatAgentSessionPRsQuery>
}) {
  if (isEmpty(prs)) return null

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
        data={prs}
        columns={columns}
        hasNextPage={query.pageInfo?.hasNextPage}
        fetchNextPage={query.fetchNextPage}
        isFetchingNextPage={query.loading}
        onVirtualSliceChange={query.setVirtualSlice}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      />
    </AccordionItem>
  )
}

const columnHelper = createColumnHelper<PullRequestFragment>()

const columns = [
  columnHelper.accessor((service) => service, {
    id: 'row',
    meta: { gridTemplate: '300' },
    cell: function Cell({ getValue }) {
      const theme = useTheme()
      const pr = getValue()

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
            <Body2P css={{ maxWidth: 140, ...TRUNCATE }}>{pr.title}</Body2P>
            <Flex flex={1} />
            <PrStatusChip
              size="small"
              status={pr.status}
            />
          </Flex>
          <CaptionP css={{ color: theme.colors['text-xlight'] }}>
            {pr.url}
          </CaptionP>
        </Flex>
      )
    },
  }),
]
