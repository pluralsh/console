import {
  Button,
  Card,
  EmptyState,
  Flex,
  IconFrame,
  PencilIcon,
  Table,
  TrashCanIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body2P } from 'components/utils/typography/Text'
import {
  useWorkbenchQuery,
  useWorkbenchWebhooksQuery,
  WorkbenchWebhookFragment,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM,
  WORKBENCHES_TRIGGERS_CREATE_WEBHOOK_QUERY_PARAM,
  WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH,
} from 'routes/workbenchesRoutesConsts'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { getWorkbenchBreadcrumbs } from '../Workbench'
import { FormCardSC } from '../create-edit/WorkbenchCreateOrEdit'
import { WorkbenchWebhookDeleteModal } from './WorkbenchWebhookDeleteModal'
import { WorkbenchWebhookTriggerForm } from './WorkbenchWebhookTriggerForm'

export function WorkbenchWebhookTrigger() {
  const theme = useTheme()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const [searchParams, setSearchParams] = useSearchParams()
  const isCreating =
    searchParams.get(WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM) === 'true'
  const isCreatingWebhook =
    searchParams.get(WORKBENCHES_TRIGGERS_CREATE_WEBHOOK_QUERY_PARAM) === 'true'
  const [editingWebhookId, setEditingWebhookId] =
    useState<Nullable<string>>(null)
  const [deletingWebhook, setDeletingWebhook] =
    useState<Nullable<WorkbenchWebhookFragment>>(null)

  const {
    data: workbenchData,
    loading: workbenchLoading,
    error: workbenchError,
  } = useWorkbenchQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
  })
  const workbench = workbenchData?.workbench

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

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getWorkbenchBreadcrumbs(workbench),
        { label: 'webhook trigger' },
      ],
      [workbench]
    )
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

  const showForm = isCreating || isCreatingWebhook || !!editingWebhook
  const showEmptyState = !!data && webhooks.length === 0

  if (workbenchError) return <GqlError error={workbenchError} />

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      width="100%"
      overflow="auto"
      padding="large"
    >
      <StackedText
        loading={!workbenchData && workbenchLoading}
        first={workbench?.name}
        firstPartialType="subtitle2"
        firstColor="text"
        second={workbench?.description}
        secondPartialType="body2"
        secondColor="text-xlight"
        gap="xxsmall"
      />
      <Flex
        direction="column"
        width="100%"
        css={{ maxWidth: 750 }}
      >
        {showForm ? (
          <FormCardSC>
            <WorkbenchWebhookTriggerForm
              key={JSON.stringify(editingWebhook) ?? 'new'}
              workbenchId={workbenchId}
              webhook={editingWebhook}
              createWebhook={isCreatingWebhook}
              onCreateWebhook={() =>
                setSearchParams(
                  {
                    [WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM]: 'true',
                    [WORKBENCHES_TRIGGERS_CREATE_WEBHOOK_QUERY_PARAM]: 'true',
                  },
                  { replace: true }
                )
              }
              onCancelCreateWebhook={() =>
                setSearchParams(
                  { [WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM]: 'true' },
                  { replace: true }
                )
              }
              onCancel={clearForm}
              onCompleted={editingWebhook ? undefined : clearForm}
            />
          </FormCardSC>
        ) : showEmptyState ? (
          <WorkbenchWebhookEmptyState workbenchId={workbenchId} />
        ) : (
          <StretchedFlex
            direction="column"
            align="stretch"
            gap="large"
          >
            <StretchedFlex
              css={{
                paddingLeft: theme.spacing.xxxsmall,
                paddingRight: theme.spacing.xxxsmall,
              }}
            >
              <Body2P
                $color="text-light"
                css={{ margin: 0 }}
              >
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
          </StretchedFlex>
        )}
      </Flex>
      <WorkbenchWebhookDeleteModal
        open={!!deletingWebhook}
        webhook={deletingWebhook}
        onClose={() => setDeletingWebhook(null)}
      />
    </Flex>
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

function WorkbenchWebhookEmptyState({ workbenchId }: { workbenchId: string }) {
  const navigate = useNavigate()

  return (
    <Card>
      <EmptyState
        message="No webhooks yet"
        description="No webhook connected. Select an existing webhook or create a new one."
        css={{ margin: '0 auto', width: 500 }}
      >
        <Flex gap="small">
          <Button
            small
            secondary
            onClick={() => {
              navigate(
                `${getWorkbenchAbsPath(workbenchId)}/${WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH}?${WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM}=true&${WORKBENCHES_TRIGGERS_CREATE_WEBHOOK_QUERY_PARAM}=true`
              )
            }}
          >
            Create new webhook
          </Button>
          <Button
            small
            onClick={() =>
              navigate(
                `${getWorkbenchAbsPath(workbenchId)}/${WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH}?${WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM}=true`
              )
            }
          >
            Select existing webhook
          </Button>
        </Flex>
      </EmptyState>
    </Card>
  )
}
