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
import { Body2P } from 'components/utils/typography/Text'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  useWorkbenchWebhooksQuery,
  WorkbenchWebhookFragment,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import {
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  WORKBENCH_PARAM_ID,
  WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM,
} from 'routes/workbenchesRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'
import {
  WorkbenchScheduleEmptyState,
  WorkbenchWebhookEmptyState,
} from './WorkbenchTriggersEmptyStates'
import { WorkbenchWebhookTriggerForm } from './WorkbenchWebhookTriggerForm'
import { WorkbenchTriggersOutletContext } from './WorkbenchTriggers'
import { FormCardSC } from '../create-edit/WorkbenchCreateOrEdit'

export function WorkbenchWebhookTrigger() {
  const navigate = useNavigate()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const [searchParams] = useSearchParams()
  const { hasSchedules, refetchSummary } =
    useOutletContext<WorkbenchTriggersOutletContext>()
  const [addingWebhook, setAddingWebhook] = useState(false)
  const createFromQuery =
    searchParams.get(WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM) === 'true'

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
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
  const hasWebhooks = webhooks.length > 0

  const columns = useMemo(
    () =>
      getColumns({
        onEdit: () => {},
        onDelete: () => {},
      }),
    []
  )

  if (error) return <GqlError error={error} />
  if (addingWebhook || createFromQuery)
    return (
      <FormCardSC>
        <WorkbenchWebhookTriggerForm
          workbenchId={workbenchId}
          onCancel={() => {
            setAddingWebhook(false)
            if (createFromQuery) {
              navigate('.', { replace: true })
            }
          }}
          onCompleted={async () => {
            await Promise.all([refetchSummary(), refetch()])
            setAddingWebhook(false)
            if (createFromQuery) {
              navigate('.', { replace: true })
            }
          }}
        />
      </FormCardSC>
    )

  if (!hasWebhooks)
    return (
      <Flex
        direction="column"
        gap="medium"
        flex={1}
      >
        <WorkbenchWebhookEmptyState />
        {!hasSchedules && <WorkbenchScheduleEmptyState />}
      </Flex>
    )

  return (
    <StretchedFlex
      direction="column"
      align="stretch"
      gap="large"
    >
      <FormCardSC>
        <StretchedFlex>
          <Body2P $color="text-light">
            Add webhooks to trigger this workbench.
          </Body2P>
          <Flex gap="small">
            <Button
              secondary
              onClick={() => {}}
            >
              Create new webhook
            </Button>
            <Button onClick={() => setAddingWebhook(true)}>Add webhook</Button>
          </Flex>
        </StretchedFlex>
        <Table
          css={{ width: '100%' }}
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
            second={webhookToExplanation(webhook)}
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

function webhookToExplanation(webhook: WorkbenchWebhookFragment) {
  if (webhook.issueWebhook) {
    return `Issue webhook: ${webhook.issueWebhook.name}`
  }

  if (webhook.webhook) {
    return `${formatWebhookType(webhook.webhook.type)} webhook: ${webhook.webhook.name}`
  }

  return 'Connected webhook trigger'
}

function formatWebhookType(type: string) {
  return type
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
