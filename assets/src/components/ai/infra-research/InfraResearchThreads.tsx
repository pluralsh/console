import {
  ChatFilledIcon,
  EmptyState,
  IconFrame,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { Body2P } from 'components/utils/typography/Text'
import { ChatThreadTinyFragment } from 'generated/graphql'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { fromNow } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import { useChatbot } from '../AIContext'
import { InfraResearchContextType } from './InfraResearch'

export function InfraResearchThreads() {
  const { infraResearch } = useOutletContext<InfraResearchContextType>()
  const { goToThread } = useChatbot()

  const threads = useMemo(
    () => infraResearch?.threads?.filter(isNonNullable) ?? [],
    [infraResearch]
  )

  if (!infraResearch) return <EmptyState message="Infra research not found." />

  return (
    <Table
      loose
      rowBg="base"
      hideHeader
      fullHeightWrap
      virtualizeRows
      data={threads}
      columns={cols}
      emptyStateProps={{ message: 'No threads found.' }}
      onRowClick={(_e, { original }: Row<ChatThreadTinyFragment>) => {
        goToThread(original.id)
      }}
    />
  )
}

const columnHelper = createColumnHelper<ChatThreadTinyFragment>()

const cols = [
  columnHelper.display({
    id: 'icon',
    cell: () => (
      <IconFrame
        size="medium"
        type="floating"
        icon={<ChatFilledIcon color="icon-info" />}
      />
    ),
  }),
  columnHelper.accessor((thread) => thread.summary, {
    id: 'summary',
    meta: { gridTemplate: '1fr' },
    cell: ({ getValue }) => <Body2P>{getValue()}</Body2P>,
  }),
  columnHelper.accessor((thread) => thread.lastMessageAt, {
    id: 'lastMessageAt',
    meta: { gridTemplate: 'max-content' },
    cell: ({ getValue }) => (getValue() ? fromNow(getValue()) : '---'),
  }),
]
