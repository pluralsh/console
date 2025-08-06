import {
  AccordionItem,
  Flex,
  IconFrame,
  PrOpenIcon,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { isEmpty } from 'lodash'
import { useTheme } from 'styled-components'
import { PullRequestFragment } from '../../../../generated/graphql.ts'
import { PrStatusChip } from '../../../self-service/pr/queue/PrQueueColumns.tsx'
import { TRUNCATE } from '../../../utils/truncate.ts'
import { Body2P, CaptionP } from '../../../utils/typography/Text.tsx'
import { ActionItemHeaderSC } from './ChatbotActionsPanel.tsx'

export function PullRequests({ prs }: { prs: PullRequestFragment[] }) {
  if (isEmpty(prs)) return null

  return (
    <AccordionItem
      key="prs"
      value="prs"
      trigger={
        <ActionItemHeaderSC>
          <IconFrame
            icon={<PrOpenIcon />}
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
        onRowClick={(_e, { original }: Row<PullRequestFragment>) =>
          window.open(original.url, '_blank', 'noopener,noreferrer')
        }
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
