import {
  Button,
  Flex,
  IconFrame,
  PencilIcon,
  Switch,
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
  useWorkbenchCronsQuery,
  WorkbenchCronFragment,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { WORKBENCH_PARAM_ID } from 'routes/workbenchesRoutesConsts'
import { formatDateTime } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchScheduleTriggerCreateForm } from './WorkbenchScheduleTriggerCreateForm'

export function WorkbenchScheduleTrigger() {
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false)

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useWorkbenchCronsQuery, keyPath: ['workbench', 'crons'] },
      { id: workbenchId }
    )

  const crons = useMemo(() => mapExistingNodes(data?.workbench?.crons), [data])

  if (error) return <GqlError error={error} />
  if (isCreatingSchedule)
    return (
      <WorkbenchScheduleTriggerCreateForm
        onCancel={() => setIsCreatingSchedule(false)}
      />
    )

  return (
    <StretchedFlex
      direction="column"
      align="stretch"
      gap="large"
    >
      <StretchedFlex>
        <Body2P $color="text-light">
          Add schedules to trigger this workbench.
        </Body2P>
        <Button onClick={() => setIsCreatingSchedule(true)}>
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
        emptyStateProps={{ message: 'No cron schedules found' }}
      />
    </StretchedFlex>
  )
}

const columnHelper = createColumnHelper<WorkbenchCronFragment>()
const columns = [
  columnHelper.accessor((cron) => cron, {
    id: 'details',
    meta: { gridTemplate: '1fr' },
    cell: ({ getValue }) => {
      const cron = getValue()
      return (
        <StackedText
          first={cron.prompt || cron.crontab || 'Cron schedule'}
          second={cronToExplanation(cron)}
        />
      )
    },
  }),
  columnHelper.display({
    id: 'actions',
    meta: { gridTemplate: '180px' },
    cell: () => (
      <Flex
        align="center"
        justify="flex-end"
        gap="xsmall"
      >
        <Switch
          checked
          onChange={() => {}}
        />
        <IconFrame
          clickable
          tooltip="Edit schedule"
          icon={<PencilIcon />}
          onClick={() => {}}
        />
        <IconFrame
          clickable
          tooltip="Delete schedule"
          icon={<TrashCanIcon color="icon-danger" />}
          onClick={() => {}}
        />
      </Flex>
    ),
  }),
]

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
  const parts = crontab.trim().split(/\s+/)
  if (parts.length < 5) return fallback

  const [minute, hour, dayOfMonth] = parts
  if (!isInteger(minute) || !isInteger(hour) || !isInteger(dayOfMonth))
    return fallback

  const hourNumber = Number(hour)
  const minuteNumber = Number(minute)
  const dayNumber = Number(dayOfMonth)

  const suffix = hourNumber >= 12 ? 'PM' : 'AM'
  const hour12 = hourNumber % 12 || 12
  const minutePadded = `${minuteNumber}`.padStart(2, '0')
  const atTime = `${hour12}:${minutePadded} ${suffix}`
  const base = `At ${atTime} on, day ${dayNumber} of the month`

  return nextRunText ? `${base}, next at ${nextRunText}` : base
}

function isInteger(value: string) {
  return /^\d+$/.test(value)
}
