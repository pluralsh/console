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
  useWorkbenchCronsQuery,
  useWorkbenchQuery,
  WorkbenchCronFragment,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getWorkbenchCronScheduleCreateAbsPath,
  getWorkbenchCronScheduleEditAbsPath,
  WORKBENCH_PARAM_ID,
} from 'routes/workbenchesRoutesConsts'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { getWorkbenchBreadcrumbs } from '../Workbench'
import { CronScheduleDeleteModal } from './CronScheduleDeleteModal'
import { isEmpty } from 'lodash'
import { cronToExplanation } from './utils'

export function CronSchedules() {
  const navigate = useNavigate()
  const theme = useTheme()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const [deletingCron, setDeletingCron] =
    useState<Nullable<WorkbenchCronFragment>>(null)

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
      { queryHook: useWorkbenchCronsQuery, keyPath: ['workbench', 'crons'] },
      { id: workbenchId }
    )

  const crons = useMemo(() => mapExistingNodes(data?.workbench?.crons), [data])

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getWorkbenchBreadcrumbs(workbench),
        { label: 'cron schedules' },
      ],
      [workbench]
    )
  )

  const columns = useMemo(
    () =>
      getColumns({
        onEdit: (cron) =>
          navigate(
            getWorkbenchCronScheduleEditAbsPath({
              workbenchId,
              cronId: cron.id,
            })
          ),
        onDelete: (cron) => setDeletingCron(cron),
      }),
    [navigate, workbenchId]
  )

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
        {!!data && isEmpty(crons) ? (
          <Card>
            <EmptyState
              message="No schedules yet"
              description="Create a schedule for the workbench with prompt."
              css={{ margin: '0 auto', width: 500 }}
            >
              <Button
                small
                onClick={() => {
                  navigate(getWorkbenchCronScheduleCreateAbsPath(workbenchId))
                }}
              >
                Create new schedule
              </Button>
            </EmptyState>
          </Card>
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
                Add schedules to trigger this workbench.
              </Body2P>
              <Button
                small
                onClick={() => {
                  navigate(getWorkbenchCronScheduleCreateAbsPath(workbenchId))
                }}
              >
                Add cron schedule
              </Button>
            </StretchedFlex>
            <Table
              hideHeader
              loose
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
          </StretchedFlex>
        )}
      </Flex>
      <CronScheduleDeleteModal
        open={!!deletingCron}
        cron={deletingCron}
        onClose={() => setDeletingCron(null)}
      />
    </Flex>
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
