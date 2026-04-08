import {
  Button,
  Card,
  EmptyState,
  Flex,
  IconFrame,
  PencilIcon,
  Table,
  TicketIcon,
  TrashCanIcon,
  VisualInspectionIcon,
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
import { useNavigate, useParams } from 'react-router-dom'
import {
  getWorkbenchWebhookTriggerCreateAbsPath,
  getWorkbenchWebhookTriggerEditAbsPath,
  WORKBENCH_PARAM_ID,
} from 'routes/workbenchesRoutesConsts'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { getWorkbenchBreadcrumbs } from '../Workbench'
import { WorkbenchWebhookDeleteModal } from './WorkbenchWebhookDeleteModal'

export function WorkbenchWebhookTrigger() {
  const navigate = useNavigate()
  const theme = useTheme()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
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

  const columns = useMemo(
    () =>
      getColumns({
        onEdit: (webhook) =>
          navigate(
            getWorkbenchWebhookTriggerEditAbsPath({
              workbenchId,
              webhookId: webhook.id,
            })
          ),
        onDelete: (webhook) => setDeletingWebhook(webhook),
      }),
    [navigate, workbenchId]
  )
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
        {showEmptyState ? (
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
              <Flex gap="small">
                <Button
                  small
                  secondary
                  onClick={() => {
                    navigate(
                      getWorkbenchWebhookTriggerCreateAbsPath(workbenchId),
                      {
                        state: { createWebhook: true },
                      }
                    )
                  }}
                >
                  Create new webhook
                </Button>
                <Button
                  small
                  onClick={() => {
                    navigate(
                      getWorkbenchWebhookTriggerCreateAbsPath(workbenchId)
                    )
                  }}
                >
                  Add webhook
                </Button>
              </Flex>
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
      id: 'icons',
      meta: { gridTemplate: '46px' },
      cell: ({ getValue }) => {
        const webhook = getValue()

        return (
          <IconFrame
            type="secondary"
            css={{ borderRadius: '50%' }}
            icon={webhookTypeIcon(webhook)}
            tooltip={webhookTypeLabel(webhook)}
          />
        )
      },
    }),
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

function webhookTypeIcon(webhook: WorkbenchWebhookFragment) {
  if (webhook.issueWebhook) return <TicketIcon />

  return <VisualInspectionIcon />
}

function webhookTypeLabel(webhook: WorkbenchWebhookFragment) {
  if (webhook.issueWebhook) return 'Ticketing'

  return 'Observability'
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
              navigate(getWorkbenchWebhookTriggerCreateAbsPath(workbenchId), {
                state: { createWebhook: true },
              })
            }}
          >
            Create new webhook
          </Button>
          <Button
            small
            onClick={() =>
              navigate(getWorkbenchWebhookTriggerCreateAbsPath(workbenchId))
            }
          >
            Select existing webhook
          </Button>
        </Flex>
      </EmptyState>
    </Card>
  )
}
