import {
  Button,
  Flex,
  IconFrame,
  PencilIcon,
  Table,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body2P } from 'components/utils/typography/Text'
import {
  useWorkbenchWebhooksQuery,
  WorkbenchWebhookFragment,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  WORKBENCH_PARAM_ID,
  WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM,
} from 'routes/workbenchesRoutesConsts'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { FormCardSC } from '../create-edit/WorkbenchCreateOrEdit'
import { WorkbenchWebhookDeleteModal } from './WorkbenchWebhookDeleteModal'
import { WorkbenchWebhookTriggerForm } from './WorkbenchWebhookTriggerForm'

export function WorkbenchWebhookTrigger() {
  const theme = useTheme()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const [searchParams, setSearchParams] = useSearchParams()
  const isCreating =
    searchParams.get(WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM) === 'true'
  const [editingWebhookId, setEditingWebhookId] =
    useState<Nullable<string>>(null)
  const [deletingWebhook, setDeletingWebhook] =
    useState<Nullable<WorkbenchWebhookFragment>>(null)

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useWorkbenchWebhooksQuery,
        keyPath: ['workbench', 'webhooks'],
      },
      { id: workbenchId }
    )
  const webhooks = useMemo(
    () => mapExistingNodes(data?.workbench?.webhooks),
    [data]
  )

  const editingWebhook = useMemo(
    () => webhooks.find((webhook) => webhook.id === editingWebhookId),
    [webhooks, editingWebhookId]
  )

  const columns = useMemo(
    () =>
      getColumns({
        onEdit: (webhook) => setEditingWebhookId(webhook.id),
        onDelete: (webhook) => setDeletingWebhook(webhook),
      }),
    []
  )
  const clearForm = () => {
    setEditingWebhookId(null)
    setSearchParams({}, { replace: true })
  }

  if (error) return <GqlError error={error} />
  if (isCreating || editingWebhook)
    return (
      <FormCardSC>
        <WorkbenchWebhookTriggerForm
          key={JSON.stringify(editingWebhook) ?? 'new'}
          workbenchId={workbenchId}
          webhook={editingWebhook}
          onCancel={clearForm}
          onCompleted={editingWebhook ? undefined : clearForm} // don't nav back on edit
        />
      </FormCardSC>
    )

  return (
    <StretchedFlex
      direction="column"
      align="stretch"
      gap="large"
    >
      <FormCardSC>
        <StretchedFlex
          css={{
            paddingLeft: theme.spacing.xxxsmall,
            paddingRight: theme.spacing.xxxsmall,
          }}
        >
          <Body2P $color="text-light">
            Add webhooks to trigger this workbench.
          </Body2P>
          <Button
            small
            onClick={() => {
              setEditingWebhookId(null)
              setSearchParams(
                { [WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM]: 'true' },
                { replace: true }
              )
            }}
          >
            Add webhook
          </Button>
        </StretchedFlex>
        <Table
          hideHeader
          fullHeightWrap
          virtualizeRows
          data={webhooks}
          columns={columns}
          loading={!data && loading}
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onVirtualSliceChange={setVirtualSlice}
        />
      </FormCardSC>
      <WorkbenchWebhookDeleteModal
        open={!!deletingWebhook}
        webhook={deletingWebhook}
        onClose={() => setDeletingWebhook(null)}
      />
    </StretchedFlex>
  )
}

const columnHelper = createColumnHelper<WorkbenchWebhookFragment>()
function getColumns({
  onEdit,
  onDelete,
}: {
  onEdit: (webhook: WorkbenchWebhookFragment) => void
  onDelete: (webhook: WorkbenchWebhookFragment) => void
}) {
  return [
    columnHelper.accessor((webhook) => webhook, {
      id: 'details',
      meta: { truncate: true, gridTemplate: 'minmax(0, 1fr)' },
      cell: ({ getValue }) => {
        const webhook = getValue()

        return (
          <StackedText
            truncate
            first={
              webhook.name ||
              webhook.webhook?.name ||
              webhook.issueWebhook?.name ||
              'Webhook trigger'
            }
            second={webhookURL(webhook)}
          />
        )
      },
    }),
    columnHelper.display({
      id: 'actions',
      meta: { gridTemplate: '100px' },
      cell: ({ row }) => (
        <Flex
          align="center"
          justify="flex-end"
          gap="xsmall"
        >
          <IconFrame
            clickable
            tooltip="Edit webhook"
            icon={<PencilIcon />}
            onClick={() => onEdit(row.original)}
          />
          <IconFrame
            clickable
            tooltip="Delete webhook"
            icon={<TrashCanIcon color="icon-danger" />}
            onClick={() => onDelete(row.original)}
          />
        </Flex>
      ),
    }),
  ]
}

function webhookURL(webhook: WorkbenchWebhookFragment) {
  if (webhook.issueWebhook) return webhook.issueWebhook.url

  if (webhook.webhook) return webhook.webhook.url

  return undefined
}
