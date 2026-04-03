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
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body2P } from 'components/utils/typography/Text'
import {
  useWorkbenchCronsQuery,
  WorkbenchCronFragment,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  WORKBENCH_PARAM_ID,
  WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM,
} from 'routes/workbenchesRoutesConsts'
import { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { FormCardSC } from '../create-edit/WorkbenchCreateOrEdit'
import { WorkbenchScheduleDeleteModal } from './WorkbenchScheduleDeleteModal'
import { WorkbenchScheduleTriggerForm } from './WorkbenchScheduleTriggerForm'

export function WorkbenchScheduleTrigger() {
  const theme = useTheme()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const [searchParams, setSearchParams] = useSearchParams()
  const isCreating =
    searchParams.get(WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM) === 'true'
  const [editingCronId, setEditingCronId] = useState<Nullable<string>>(null)
  const [deletingCron, setDeletingCron] =
    useState<Nullable<WorkbenchCronFragment>>(null)

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useWorkbenchCronsQuery, keyPath: ['workbench', 'crons'] },
      { id: workbenchId }
    )

  const crons = useMemo(() => mapExistingNodes(data?.workbench?.crons), [data])

  const editingCron = useMemo(
    () => crons.find((cron) => cron.id === editingCronId),
    [crons, editingCronId]
  )

  const columns = useMemo(
    () =>
      getColumns({
        onEdit: (cron) => setEditingCronId(cron.id),
        onDelete: (cron) => setDeletingCron(cron),
      }),
    []
  )
  const clearForm = () => {
    setEditingCronId(null)
    setSearchParams({}, { replace: true })
  }

  if (error) return <GqlError error={error} />
  if (isCreating || editingCron)
    return (
      <FormCardSC>
        <WorkbenchScheduleTriggerForm
          key={JSON.stringify(editingCron) ?? 'new'}
          workbenchId={workbenchId}
          cron={editingCron}
          onCancel={clearForm}
          onCompleted={editingCron ? undefined : clearForm}
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
            Add schedules to trigger this workbench.
          </Body2P>
          <Button
            small
            onClick={() => {
              setEditingCronId(null)
              setSearchParams(
                { [WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM]: 'true' },
                { replace: true }
              )
            }}
          >
            Add cron schedule
          </Button>
        </StretchedFlex>
        <Table
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
        open={!!deletingCron}
        cron={deletingCron}
        onClose={() => setDeletingCron(null)}
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
  const fallback = `Next ${nextRunText ? `at ${nextRunText}` : 'run not scheduled yet'}`

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
