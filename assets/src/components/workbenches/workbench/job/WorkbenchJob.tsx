import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { GqlError } from 'components/utils/Alert'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import {
  useWorkbenchJobActivityDeltaSubscription,
  useWorkbenchJobProgressSubscription,
  useWorkbenchJobQuery,
  WorkbenchJobActivityFragment,
  WorkbenchJobFragment,
  WorkbenchJobProgressTinyFragment,
} from 'generated/graphql'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  getWorkbenchJobAbsPath,
  WORKBENCH_JOBS_PARAM_JOB,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_ABS_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchJobActivities } from './WorkbenchJobActivities'
import { WorkbenchJobResult } from './WorkbenchJobResult'
import { WorkbenchJobTodos } from './WorkbenchJobTodos'

export type WorkbenchProgressMap = Record<
  string,
  Array<WorkbenchJobProgressTinyFragment>
>

export function WorkbenchJob() {
  const {
    [WORKBENCH_PARAM_ID]: workbenchId = '',
    [WORKBENCH_JOBS_PARAM_JOB]: jobId = '',
  } = useParams()
  const [progressByActivityId, setProgressByActivityId] =
    useState<WorkbenchProgressMap>({})

  const {
    data: jobQueryData,
    loading: jobQueryLoading,
    error: jobQueryError,
  } = useWorkbenchJobQuery({
    skip: !jobId,
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
    pollInterval: 5_000,
  })
  const [job, setJob] = useState<Nullable<WorkbenchJobFragment>>(null)

  useEffect(() => {
    setJob(jobQueryData?.workbenchJob ?? null)
  }, [jobQueryData?.workbenchJob])

  useWorkbenchJobActivityDeltaSubscription({
    skip: !jobId,
    ignoreResults: true,
    variables: { jobId },
    onData: ({ data: { data } }) => {
      const payload = data?.workbenchJobActivityDelta?.payload
      if (!payload) return

      setJob((prev) => upsertActivityInJob(prev, payload))
    },
  })

  useWorkbenchJobProgressSubscription({
    skip: !jobId,
    ignoreResults: true,
    variables: { jobId },
    onData: ({ data: { data } }) => {
      const payload = data?.workbenchJobProgress
      if (!payload) return

      setProgressByActivityId((prev) => appendProgressEvent(prev, payload))
    },
  })

  const loading = jobQueryLoading && !job

  const error = useMemo(
    () => job?.error ?? jobQueryError,
    [job?.error, jobQueryError]
  )
  const errorHeader = job?.error
    ? 'Workbench job reported an error'
    : jobQueryError
      ? 'Failed to load workbench job'
      : undefined

  useSetBreadcrumbs(
    useMemo(
      () => [
        { label: 'workbenches', url: WORKBENCHES_ABS_PATH },
        {
          label: job?.workbench?.name ?? 'workbench',
          url: getWorkbenchAbsPath(workbenchId),
        },
        {
          label: job?.prompt ?? 'workbench job',
          url: getWorkbenchJobAbsPath({ workbenchId, jobId }),
        },
      ],
      [job, workbenchId, jobId]
    )
  )

  return (
    <>
      {error && (
        <GqlError
          margin="large"
          header={errorHeader}
          error={error}
        />
      )}
      <WrapperSC>
        <Flex
          direction="column"
          gap="large"
          minWidth={560}
          flex={5}
        >
          <StretchedFlex gap="xlarge">
            <StackedText
              truncate
              loading={loading}
              first={job?.workbench?.name}
              firstColor="text"
              firstPartialType="subtitle2"
              second={job?.prompt}
              secondColor="text-xlight"
              secondPartialType="body2"
            />
            <RunStatusChip
              loading={loading}
              status={job?.status}
            />
          </StretchedFlex>
          <WorkbenchJobActivities
            loading={loading}
            activities={mapExistingNodes(job?.activities)}
            progressByActivityId={progressByActivityId}
          />
        </Flex>
        <Flex
          direction="column"
          gap="medium"
          minWidth={500}
          flex={6}
          height="100%"
        >
          <WorkbenchJobResult
            loading={loading}
            result={job?.result}
          />
          <WorkbenchJobTodos
            loading={loading}
            result={job?.result}
          />
        </Flex>
      </WrapperSC>
    </>
  )
}

function upsertActivityInJob(
  jobState: Nullable<WorkbenchJobFragment>,
  activity: WorkbenchJobActivityFragment
) {
  if (!jobState) return jobState

  const previousEdges = jobState.activities?.edges ?? []
  const updatedEdges = [...previousEdges]
  const index = updatedEdges.findIndex((edge) => edge?.node?.id === activity.id)

  if (index >= 0) {
    updatedEdges[index] = {
      __typename: 'WorkbenchJobActivityEdge',
      node: activity as any,
    } as any
  } else {
    updatedEdges.push({
      __typename: 'WorkbenchJobActivityEdge',
      node: activity,
    })
  }

  return {
    ...jobState,
    activities: {
      ...(jobState.activities ?? {}),
      __typename: 'WorkbenchJobActivityConnection',
      edges: updatedEdges,
    } as any,
  }
}

function appendProgressEvent(
  progressByActivityId: WorkbenchProgressMap,
  progress: WorkbenchJobProgressTinyFragment
): WorkbenchProgressMap {
  const current = progressByActivityId[progress.activityId] ?? []
  const alreadyExists = current.some(
    (event) =>
      event.text === progress.text &&
      event.tool === progress.tool &&
      JSON.stringify(event.arguments ?? {}) ===
        JSON.stringify(progress.arguments ?? {})
  )

  if (alreadyExists) return progressByActivityId

  return {
    ...progressByActivityId,
    [progress.activityId]: [...current, progress],
  }
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.large,
  height: '100%',
  width: '100%',
  overflow: 'auto',
  padding: theme.spacing.large,
  paddingTop: 0,
}))
