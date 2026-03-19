import {
  useWorkbenchJobActivityDeltaSubscription,
  useWorkbenchJobDeltaSubscription,
  useWorkbenchJobProgressSubscription,
  useWorkbenchRunQuery,
  WorkbenchJob,
  WorkbenchJobActivityFragment,
  WorkbenchJobProgressTinyFragment,
} from '../../../../generated/graphql'
import { useParams } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  getWorkbenchRunAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCH_RUNS_PARAM_RUN,
  WORKBENCHES_ABS_PATH,
} from '../../../../routes/workbenchesRoutesConsts'
import { IconFrame, MoreIcon, useSetBreadcrumbs } from '@pluralsh/design-system'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { MoreMenu } from '../../../utils/MoreMenu'
import { StackedText } from '../../../utils/table/StackedText'
import { useEffect, useMemo, useState } from 'react'
import { GqlError } from '../../../utils/Alert'
import {
  createWorkbenchRunMockFeeder,
  WorkbenchProgressMap,
  WorkbenchRunMockPanelState,
} from './workbenchRunMockData'
import { mapExistingNodes } from '../../../../utils/graphql'
import { WorkbenchRunActivities } from './WorkbenchRunActivities'
import { WorkbenchRunTodos } from './WorkbenchRunTodos'
import { WorkbenchRunResult } from './WorkbenchRunResult'
import styled from 'styled-components'

type WorkbenchRunDataSource = 'mock' | 'live'

export function WorkbenchRun() {
  const {
    [WORKBENCH_PARAM_ID]: workbenchId = '',
    [WORKBENCH_RUNS_PARAM_RUN]: runId = '',
  } = useParams()
  const dataSource: WorkbenchRunDataSource = 'live'
  const isMockMode = dataSource === 'mock'

  const feeder = useMemo(
    () => createWorkbenchRunMockFeeder({ loop: true, speed: 0.2 }),
    []
  )
  const [run, setRun] = useState<WorkbenchJob | null>(null)
  const [progressByActivityId, setProgressByActivityId] =
    useState<WorkbenchProgressMap>({})
  const [panelStateOverride, setPanelStateOverride] =
    useState<WorkbenchRunMockPanelState | null>(null)

  const {
    data: runQueryData,
    loading: runQueryLoading,
    error: runQueryError,
  } = useWorkbenchRunQuery({
    skip: isMockMode || !runId,
    variables: { id: runId },
    fetchPolicy: 'cache-and-network',
    pollInterval: 5_000,
  })

  useWorkbenchJobDeltaSubscription({
    skip: isMockMode || !runId,
    variables: { id: runId },
    onData: ({ data: { data } }) => {
      const payload = data?.workbenchJobDelta?.payload
      if (payload) setRun(payload as WorkbenchJob)
    },
  })

  useWorkbenchJobActivityDeltaSubscription({
    skip: isMockMode || !runId,
    variables: { jobId: runId },
    onData: ({ data: { data } }) => {
      const payload = data?.workbenchJobActivityDelta?.payload
      if (!payload) return

      setRun((prev) =>
        upsertActivityInRun(prev, payload as WorkbenchJobActivityFragment)
      )
    },
  })

  useWorkbenchJobProgressSubscription({
    skip: isMockMode || !runId,
    variables: { jobId: runId },
    onData: ({ data: { data } }) => {
      const payload = data?.workbenchJobProgress
      if (!payload) return

      setProgressByActivityId((prev) =>
        appendProgressEvent(prev, payload as WorkbenchJobProgressTinyFragment)
      )
    },
  })

  useEffect(() => {
    if (!isMockMode) return

    const unsubscribe = feeder.subscribe((_, nextState) => {
      setRun(nextState.run as WorkbenchJob | null)
      setProgressByActivityId(nextState.progressByActivityId)
      setPanelStateOverride(nextState.panelStateOverride)
    })

    feeder.reset()
    const initialState = feeder.getState()
    setRun(initialState.run as WorkbenchJob | null)
    setProgressByActivityId(initialState.progressByActivityId)
    setPanelStateOverride(initialState.panelStateOverride)
    feeder.start()

    return () => {
      unsubscribe()
      feeder.stop()
    }
  }, [feeder, isMockMode])

  useEffect(() => {
    if (isMockMode) return

    setProgressByActivityId({})
    setPanelStateOverride(null)
    setRun((runQueryData?.workbenchJob as WorkbenchJob) ?? null)
  }, [isMockMode, runId, runQueryData?.workbenchJob])

  const loading = isMockMode ? !run : runQueryLoading && !run

  const error = useMemo(
    () => run?.error ?? (!isMockMode ? runQueryError : null),
    [isMockMode, run?.error, runQueryError]
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
          url: getWorkbenchAbsPath(run?.workbench?.id ?? workbenchId),
        },
        {
          label: run?.prompt ?? 'workbench run',
          url: getWorkbenchRunAbsPath({
            workbenchId: run?.workbench?.id ?? workbenchId,
            runId: run?.id ?? runId,
          }),
        },
      ],
      [
        run?.workbench?.name,
        run?.workbench?.id,
        run?.prompt,
        run?.id,
        workbenchId,
        runId,
      ]
    )
  )

  return (
    <RunWrapperSC>
      <WorkbenchRunHeader
        loading={loading}
        job={run as WorkbenchJob}
      />
      {error && (
        <GqlError
          header={errorHeader}
          error={error}
        />
      )}
      <RunBodySC>
        <WorkbenchRunActivities
          loading={loading}
          activities={mapExistingNodes(run?.activities)}
          progressByActivityId={progressByActivityId}
          state={panelStateOverride ?? undefined}
        />
        <WorkbenchRunSidecar
          loading={loading}
          result={run?.result}
        />
      </RunBodySC>
    </RunWrapperSC>
  )
}

function WorkbenchRunHeader({
  loading,
  job,
}: {
  loading: boolean
  job: WorkbenchJob
}) {
  return (
    <HeaderSC>
      <HeaderTextSC>
        <StackedText
          loading={loading}
          first={job?.workbench?.name}
          firstColor="text"
          firstPartialType="subtitle2"
          second={job?.prompt}
          secondColor="text-xlight"
          secondPartialType="body2"
        />
      </HeaderTextSC>
      <HeaderActionsSC>
        <RunStatusChip
          loading={loading}
          size="large"
          status={job?.status}
        />
        <MoreMenu
          loading={loading}
          triggerButton={
            <IconFrame
              clickable
              type="secondary"
              icon={<MoreIcon css={{ width: 16 }} />}
            />
          }
        />
      </HeaderActionsSC>
    </HeaderSC>
  )
}

function WorkbenchRunSidecar({
  loading,
  result,
}: {
  loading: boolean
  result?: WorkbenchJob['result']
}) {
  return (
    <SidecarSC>
      <WorkbenchRunResult
        loading={loading}
        result={result}
      />
      <WorkbenchRunTodos
        loading={loading}
        result={result}
      />
    </SidecarSC>
  )
}

function upsertActivityInRun(
  run: WorkbenchJob | null,
  activity: WorkbenchJobActivityFragment
): WorkbenchJob | null {
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
      node: activity as any,
    } as any)
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

const RunWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing.xlarge,
  gap: theme.spacing.xlarge,
  height: '100%',
  minHeight: 0,
}))

const RunBodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  gap: theme.spacing.xlarge,
  height: '100%',
  minHeight: 0,
}))

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,
}))

const HeaderTextSC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: '1',
  flexDirection: 'column',
  gap: theme.spacing.medium,
}))

const HeaderActionsSC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: '1',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: theme.spacing.small,
}))

const SidecarSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  gap: theme.spacing.medium,
}))
