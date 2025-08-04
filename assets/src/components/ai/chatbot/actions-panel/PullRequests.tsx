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
import { useTheme } from 'styled-components'
import { Body2P, CaptionP } from '../../../utils/typography/Text.tsx'
import { TRUNCATE } from '../../../utils/truncate.ts'
import { PrStatusChip } from '../../../self-service/pr/queue/PrQueueColumns.tsx'

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
