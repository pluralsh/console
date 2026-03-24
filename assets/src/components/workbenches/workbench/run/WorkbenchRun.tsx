import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { GqlError } from 'components/utils/Alert'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import {
  useWorkbenchJobActivityDeltaSubscription,
  useWorkbenchJobProgressSubscription,
  useWorkbenchRunQuery,
  WorkbenchJobActivityFragment,
  WorkbenchJobFragment,
  WorkbenchJobProgressTinyFragment,
} from 'generated/graphql'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  getWorkbenchRunAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCH_RUNS_PARAM_RUN,
  WORKBENCHES_ABS_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchRunActivities } from './WorkbenchRunActivities'
import { WorkbenchRunResult } from './WorkbenchRunResult'
import { WorkbenchRunTodos } from './WorkbenchRunTodos'

export type WorkbenchProgressMap = Record<
  string,
  Array<WorkbenchJobProgressTinyFragment>
>

// note: we're using the terms "run" and "job" interchangeably throughout workbenches
export function WorkbenchRun() {
  const {
    [WORKBENCH_PARAM_ID]: workbenchId = '',
    [WORKBENCH_RUNS_PARAM_RUN]: runId = '',
  } = useParams()
  const [progressByActivityId, setProgressByActivityId] =
    useState<WorkbenchProgressMap>({})

  const {
    data: runQueryData,
    loading: runQueryLoading,
    error: runQueryError,
  } = useWorkbenchRunQuery({
    skip: !runId,
    variables: { id: runId },
    fetchPolicy: 'cache-and-network',
    pollInterval: 5_000,
  })
  const [run, setRun] = useState<Nullable<WorkbenchJobFragment>>(null)

  useEffect(() => {
    setRun(runQueryData?.workbenchJob ?? null)
  }, [runQueryData?.workbenchJob])

  useWorkbenchJobActivityDeltaSubscription({
    skip: !runId,
    ignoreResults: true,
    variables: { jobId: runId },
    onData: ({ data: { data } }) => {
      const payload = data?.workbenchJobActivityDelta?.payload
      if (!payload) return

      setRun((prev) => upsertActivityInRun(prev, payload))
    },
  })

  useWorkbenchJobProgressSubscription({
    skip: !runId,
    ignoreResults: true,
    variables: { jobId: runId },
    onData: ({ data: { data } }) => {
      const payload = data?.workbenchJobProgress
      if (!payload) return

      setProgressByActivityId((prev) => appendProgressEvent(prev, payload))
    },
  })

  const loading = runQueryLoading && !run

  const error = useMemo(
    () => run?.error ?? runQueryError,
    [run?.error, runQueryError]
  )
  const errorHeader = run?.error
    ? 'Workbench run reported an error'
    : runQueryError
      ? 'Failed to load workbench run'
      : undefined

  useSetBreadcrumbs(
    useMemo(
      () => [
        { label: 'workbenches', url: WORKBENCHES_ABS_PATH },
        {
          label: run?.workbench?.name ?? 'workbench',
          url: getWorkbenchAbsPath(workbenchId),
        },
        {
          label: run?.prompt ?? 'workbench run',
          url: getWorkbenchRunAbsPath({ workbenchId, runId }),
        },
      ],
      [run, workbenchId, runId]
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
              first={run?.workbench?.name}
              firstColor="text"
              firstPartialType="subtitle2"
              second={run?.prompt}
              secondColor="text-xlight"
              secondPartialType="body2"
            />
            <RunStatusChip
              loading={loading}
              status={run?.status}
            />
          </StretchedFlex>
          <WorkbenchRunActivities
            loading={loading}
            activities={mapExistingNodes(run?.activities)}
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
          <WorkbenchRunResult
            loading={loading}
            result={run?.result}
          />
          <WorkbenchRunTodos
            loading={loading}
            result={run?.result}
          />
        </Flex>
      </WrapperSC>
    </>
  )
}

function upsertActivityInRun(
  run: Nullable<WorkbenchJobFragment>,
  activity: WorkbenchJobActivityFragment
) {
  if (!run) return run

  const previousEdges = run.activities?.edges ?? []
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
    ...run,
    activities: {
      ...(run.activities ?? {}),
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
