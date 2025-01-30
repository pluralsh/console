import { ListBoxItem, PencilIcon, TrashCanIcon } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useState } from 'react'
import styled, { useTheme } from 'styled-components'

import {
  ObservabilityWebhookFragment,
  useDeleteObservabilityWebhookMutation,
} from 'generated/graphql'

import { Confirm } from 'components/utils/Confirm'
import { MoreMenu } from 'components/utils/MoreMenu'

import { DateTimeCol } from 'components/utils/table/DateTimeCol'

import { toDateOrUndef } from 'utils/date'

import CopyButton from 'components/utils/CopyButton'
import { TRUNCATE } from 'components/utils/truncate'
import { capitalize } from 'lodash'
import { EditObservabilityWebhookModal } from './EditObservabilityWebhook'

enum MenuItemKey {
  Edit = 'edit',
  Delete = 'delete',
}

export const columnHelper = createColumnHelper<ObservabilityWebhookFragment>()

const ColType = columnHelper.accessor(({ type }) => capitalize(type), {
  id: 'type',
  header: 'Type',
})

const ColName = columnHelper.accessor(({ name }) => name, {
  id: 'name',
  header: 'Name',
  meta: { gridTemplate: '1fr' },
})

const ColUrl = columnHelper.accessor(({ url }) => url, {
  id: 'url',
  header: 'URL',
  meta: { gridTemplate: 'minmax(200px, 2fr)' },
  cell: function Cell({ getValue }) {
    const [showCopy, setShowCopy] = useState(false)
    return (
      <ColUrlWrapper
        onMouseEnter={() => setShowCopy(true)}
        onMouseLeave={() => setShowCopy(false)}
      >
        <span css={TRUNCATE}>{getValue()}</span>
        {showCopy && <CopyButton text={getValue()} />}
      </ColUrlWrapper>
    )
  },
})

const ColUrlWrapper = styled.span(({ theme }) => ({
  maxWidth: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
}))

export const ColLastActivity = columnHelper.accessor(
  ({ updatedAt, insertedAt }) =>
    toDateOrUndef(updatedAt) || toDateOrUndef(insertedAt),
  {
    id: 'lastUpdated',
    header: 'Last Updated',
    sortingFn: 'datetime',
    cell: ({ getValue }) => <DateTimeCol date={getValue()?.toISOString()} />,
  }
)

export const ColActions = columnHelper.display({
  id: 'actions',
  header: '',
  cell: function Cell({ row, table }) {
    const theme = useTheme()
    const observabilityWebhook = row.original
    const [menuKey, setMenuKey] = useState<MenuItemKey | ''>()

    if (!observabilityWebhook) return null

    return (
      <>
        <MoreMenu onSelectionChange={(newKey) => setMenuKey(newKey)}>
          <ListBoxItem
            key={MenuItemKey.Edit}
            leftContent={<PencilIcon />}
            label="Edit webhook"
            textValue="Edit webhook"
          />
          <ListBoxItem
            key={MenuItemKey.Delete}
            leftContent={
              <TrashCanIcon color={theme.colors['icon-danger-critical']} />
            }
            label="Delete webhook"
            textValue="Delete webhook"
          />
        </MoreMenu>
        {/* Modals */}
        <EditObservabilityWebhookModal
          operationType="update"
          open={menuKey === MenuItemKey.Edit}
          observabilityWebhook={observabilityWebhook}
          refetch={() => table.options.meta?.refetch?.()}
          onClose={() => setMenuKey('')}
        />
        <DeleteObservabilityWebhookModal
          observabilityWebhook={observabilityWebhook}
          open={menuKey === MenuItemKey.Delete}
          refetch={() => table.options.meta?.refetch?.()}
          onClose={() => setMenuKey('')}
        />
      </>
    )
  },
})

export function DeleteObservabilityWebhookModal({
  observabilityWebhook,
  open,
  onClose,
  refetch,
}: {
  observabilityWebhook: ObservabilityWebhookFragment
  open: boolean
  onClose?: () => void
  refetch?: () => void
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useDeleteObservabilityWebhookMutation({
    variables: { id: observabilityWebhook.id },
    onCompleted: () => {
      refetch?.()
      onClose?.()
    },
  })

  return (
    <Confirm
      close={() => onClose?.()}
      destructive
      label="Delete"
      loading={loading}
      error={error}
      open={open}
      submit={() => mutation()}
      title="delete observability webhook"
      text={
        <>
          Are you sure you want to delete{' '}
          <span css={{ color: theme.colors['text-danger'] }}>
            “{observabilityWebhook.name}”
          </span>
          ?
        </>
      }
    />
  )
}

export const columns = [ColType, ColName, ColUrl, ColLastActivity, ColActions]
