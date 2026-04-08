import {
  Button,
  EmptyState,
  Flex,
  ReturnIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'
import { useWorkbenchCronsQuery, useWorkbenchQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getWorkbenchCronSchedulesAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_CRON_PARAM_ID,
} from 'routes/workbenchesRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'
import { getWorkbenchBreadcrumbs } from '../Workbench'
import { FormCardSC } from '../create-edit/WorkbenchCreateOrEdit'
import { WorkbenchScheduleTriggerForm } from './WorkbenchScheduleTriggerForm'

export function WorkbenchScheduleTriggerCreateOrEdit({
  mode,
}: {
  mode: 'create' | 'edit'
}) {
  const navigate = useNavigate()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const cronId = useParams()[WORKBENCHES_CRON_PARAM_ID]

  const {
    data: workbenchData,
    loading: workbenchLoading,
    error: workbenchError,
  } = useWorkbenchQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
  })
  const workbench = workbenchData?.workbench

  const {
    data: cronsData,
    loading: cronsLoading,
    error: cronsError,
  } = useWorkbenchCronsQuery({
    variables: { id: workbenchId },
    skip: mode !== 'edit' || !workbenchId,
  })

  // FIXME: Add more efficient query that just fetches the single cron by ID.
  // This is important as we are loading only first page of crons.
  const cron = useMemo(() => {
    if (mode !== 'edit') return null

    return mapExistingNodes(cronsData?.workbench?.crons).find(
      (item) => item.id === cronId
    )
  }, [cronsData, cronId, mode])

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getWorkbenchBreadcrumbs(workbench),
        {
          label: 'cron schedules',
          url: getWorkbenchCronSchedulesAbsPath(workbenchId),
        },
        { label: mode === 'create' ? 'create' : 'edit' },
      ],
      [mode, workbench, workbenchId]
    )
  )

  if (workbenchError) return <GqlError error={workbenchError} />
  if (cronsError) return <GqlError error={cronsError} />

  if (mode === 'edit' && !cronsLoading && !cron)
    return (
      <EmptyState message="Schedule not found.">
        <Button
          startIcon={<ReturnIcon />}
          onClick={() =>
            navigate(getWorkbenchCronSchedulesAbsPath(workbenchId))
          }
        >
          Back to all schedules
        </Button>
      </EmptyState>
    )

  const isLoading =
    (!workbenchData && workbenchLoading) ||
    (mode === 'edit' && !cronsData && cronsLoading)

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
        {isLoading ? (
          <RectangleSkeleton
            $width="100%"
            $height="100%"
          />
        ) : (
          <FormCardSC>
            <WorkbenchScheduleTriggerForm
              workbenchId={workbenchId}
              cron={cron}
            />
          </FormCardSC>
        )}
      </Flex>
    </Flex>
  )
}
