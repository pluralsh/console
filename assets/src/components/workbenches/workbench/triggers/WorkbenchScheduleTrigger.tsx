import {
  Button,
  Flex,
  IconFrame,
  PencilIcon,
  Table,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import cronstrue from 'cronstrue'
import { GqlError } from 'components/utils/Alert'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { Body2P } from 'components/utils/typography/Text'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  useWorkbenchCronsQuery,
  WorkbenchCronFragment,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import {
  useOutletContext,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  WORKBENCH_PARAM_ID,
  WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM,
} from 'routes/workbenchesRoutesConsts'
import { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchScheduleDeleteModal } from './WorkbenchScheduleDeleteModal'
import {
  WorkbenchScheduleEmptyState,
  WorkbenchWebhookEmptyState,
} from './WorkbenchTriggersEmptyStates'
import { WorkbenchScheduleTriggerForm } from './WorkbenchScheduleTriggerForm'
import { WorkbenchTriggersOutletContext } from './WorkbenchTriggers'
import { FormCardSC } from '../create-edit/WorkbenchCreateOrEdit'

export function WorkbenchScheduleTrigger() {
  const theme = useTheme()
  const navigate = useNavigate()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const [searchParams] = useSearchParams()
  const { hasSchedules, hasWebhooks, refetchSummary } =
    useOutletContext<WorkbenchTriggersOutletContext>()
  const [creatingCron, setCreatingCron] = useState(false)
  const [editingCron, setEditingCron] =
    useState<Nullable<WorkbenchCronFragment>>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedCron, setSelectedCron] =
    useState<Nullable<WorkbenchCronFragment>>(null)

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    { queryHook: useWorkbenchCronsQuery, keyPath: ['workbench', 'crons'] },
    { id: workbenchId }
  )

  const crons = useMemo(() => mapExistingNodes(data?.workbench?.crons), [data])
  const createFromQuery =
    searchParams.get(WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM) === 'true'

  const columns = useMemo(
    () =>
      getColumns({
        onEdit: (cron) => {
          setEditingCron(cron)
          setCreatingCron(false)
        },
        onDelete: (cron) => {
          setSelectedCron(cron)
          setIsDeleteModalOpen(true)
        },
      }),
    []
  )

  if (error) return <GqlError error={error} />
  if (creatingCron || createFromQuery || editingCron)
    return (
      <FormCardSC>
        <WorkbenchScheduleTriggerForm
          workbenchId={workbenchId}
          cron={editingCron}
          onCancel={() => {
            setCreatingCron(false)
            setEditingCron(null)
            if (createFromQuery) {
              navigate('.', { replace: true })
            }
          }}
          onCompleted={async () => {
            await Promise.all([refetchSummary(), refetch()])
            setCreatingCron(false)
            setEditingCron(null)
            if (createFromQuery) {
              navigate('.', { replace: true })
            }
          }}
        />
      </FormCardSC>
    )

  if (!hasSchedules)
    return (
      <Flex
        direction="column"
        gap="medium"
        flex={1}
      >
        <WorkbenchScheduleEmptyState />
        {!hasWebhooks && <WorkbenchWebhookEmptyState />}
      </Flex>
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
            Add schedules to trigger this workbench.
          </Body2P>
          <Button
            small
            onClick={() => {
              setEditingCron(null)
              setCreatingCron(true)
            }}
          >
            Add cron schedule
          </Button>
        </StretchedFlex>
        <Table
          css={{ width: '100%' }}
          hideHeader
          fullHeightWrap
          virtualizeRows
          data={crons}
          columns={columns}
          loading={!data && loading}
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onVirtualSliceChange={setVirtualSlice}
        />
      </FormCardSC>
      <WorkbenchScheduleDeleteModal
        open={isDeleteModalOpen}
        cron={selectedCron}
        onDeleted={async () => {
          await Promise.all([refetchSummary(), refetch()])
        }}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setSelectedCron(null)
        }}
      />
    </StretchedFlex>
  )
}

const columnHelper = createColumnHelper<WorkbenchCronFragment>()
function getColumns({
  onEdit,
  onDelete,
}: {
  onEdit: (cron: WorkbenchCronFragment) => void
  onDelete: (cron: WorkbenchCronFragment) => void
}) {
  return [
    columnHelper.accessor((cron) => cron, {
      id: 'details',
      meta: { truncate: true, gridTemplate: 'minmax(0, 1fr)' },
      cell: ({ getValue }) => {
        const cron = getValue()
        return (
          <StackedText
            truncate
            first={cron.prompt || cron.crontab || 'Cron schedule'}
            second={cronToExplanation(cron)}
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
            tooltip="Edit schedule"
            icon={<PencilIcon />}
            onClick={() => onEdit(row.original)}
          />
          <IconFrame
            clickable
            tooltip="Delete schedule"
            icon={<TrashCanIcon color="icon-danger" />}
            onClick={() => onDelete(row.original)}
          />
        </Flex>
      ),
    }),
  ]
}

function cronToExplanation({
  crontab,
  nextRunAt,
}: Pick<WorkbenchCronFragment, 'crontab' | 'nextRunAt'>) {
  const nextRunText = nextRunAt
    ? formatDateTime(nextRunAt, 'MMM D, YYYY [at] h:mm A')
    : null
  const fallback = nextRunText
    ? `Next at ${nextRunText}`
    : 'Next run not scheduled yet'

  if (!crontab) return fallback

  try {
    const description = cronstrue.toString(crontab.trim(), {
      throwExceptionOnParseError: true,
    })

    return nextRunText ? `${description}, next at ${nextRunText}` : description
  } catch {
    return fallback
  }
}
