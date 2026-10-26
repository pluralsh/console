import { useApolloClient } from '@apollo/client'
import { DashboardIcon } from '@pluralsh/design-system'
import { StackedText } from 'components/utils/table/StackedText'
import { rangeWindow } from 'components/utils/timerange/timeRange'
import { TimeRangeControl } from 'components/utils/timerange/TimeRangeControl'
import { useTimeRange } from 'components/utils/timerange/useTimeRange'
import { Body2BoldP } from 'components/utils/typography/Text'
import {
  DashboardTimeRangeAttributes,
  useWorkbenchCanvasStreamSubscription,
  WorkbenchCanvasBlockFragment,
  WorkbenchJobActivityFragment,
} from 'generated/graphql'
import { WorkbenchJobActivityFragmentDoc } from 'generated/graphql-documents'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'
import styled from 'styled-components'
import { updateFragment } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { WorkbenchDashboardPanels } from '../monitoring/WorkbenchDashboardPanels'
import { JobCanvasGraphSource } from './JobCanvasGraphSource'
import { CANVAS_COLUMNS, canvasPanels } from './workbenchJobCanvasPanels'
import {
  definedJobTimeRange,
  JOB_TIME_RANGE_PRESETS,
} from './workbenchJobTimeRange'

const NO_VARIABLES: Record<string, string> = {}

export function WorkbenchJobCanvas({
  jobId,
  activityId,
  canvas,
}: {
  jobId: string
  activityId?: string
  canvas: Nullable<Nullable<WorkbenchCanvasBlockFragment>[]>
}) {
  const client = useApolloClient()
  useWorkbenchCanvasStreamSubscription({
    variables: { jobId, activityId },
    skip: !jobId || !activityId,
    ignoreResults: true,
    onData: ({ data: { data } }) => {
      const block = data?.workbenchCanvasStream
      if (!block || !activityId) return
      mergeCanvasBlockInActivityCache(client.cache, activityId, block)
    },
  })

  const { graphs, queries } = useMemo(
    () => canvasPanels((canvas ?? []).filter(isNonNullable)),
    [canvas]
  )
  const queryArgs = Object.values(queries).map(({ query }) => query.toolArgs)
  const definedRange = definedJobTimeRange(queryArgs)
  const { range, now, timeWindow, revision, setRange, selectWindow } =
    useTimeRange(definedRange)
  // Follow the queries' range as blocks stream in until the user picks one.
  const touched = revision > 0
  const { start, end } = touched ? timeWindow : rangeWindow(definedRange, now)
  const startIso = start.toISOString()
  const endIso = end.toISOString()
  const timeRange = useMemo<DashboardTimeRangeAttributes>(
    () => ({ start: startIso, end: endIso }),
    [startIso, endIso]
  )

  if (isEmpty(graphs)) return null

  return (
    <CanvasSC>
      <CanvasHeaderSC>
        <StackedText
          icon={<DashboardIcon />}
          first={<Body2BoldP>Dashboard</Body2BoldP>}
        />
        {!isEmpty(queries) && (
          <TimeRangeControl
            value={touched ? range : definedRange}
            now={now}
            presets={JOB_TIME_RANGE_PRESETS}
            onChange={setRange}
          />
        )}
      </CanvasHeaderSC>
      <JobCanvasGraphSource
        jobId={jobId}
        queries={queries}
      >
        <WorkbenchDashboardPanels
          graphs={graphs}
          variables={NO_VARIABLES}
          timeRange={timeRange}
          rangeRevision={revision}
          queriesEnabled
          onRangeSelect={selectWindow}
          columns={CANVAS_COLUMNS}
        />
      </JobCanvasGraphSource>
    </CanvasSC>
  )
}

const mergeCanvasBlockInActivityCache = (
  cache: ReturnType<typeof useApolloClient>['cache'],
  activityId: string,
  block: WorkbenchCanvasBlockFragment
) =>
  updateFragment(cache, {
    id: cache.identify({ __typename: 'WorkbenchJobActivity', id: activityId }),
    fragment: WorkbenchJobActivityFragmentDoc,
    fragmentName: 'WorkbenchJobActivity',
    update: (prev: WorkbenchJobActivityFragment) => {
      if (!prev.result) return prev
      const existing = (prev.result.canvas ?? []).filter(isNonNullable)
      const idx = block.identifier
        ? existing.findIndex((b) => b.identifier === block.identifier)
        : -1
      const canvas =
        idx >= 0
          ? existing.map((b, i) => (i === idx ? block : b))
          : [...existing, block]
      return { ...prev, result: { ...prev.result, canvas } }
    },
  })

const CanvasSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  width: '100%',
}))

const CanvasHeaderSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.small,
  justifyContent: 'space-between',
  minHeight: 32,
}))
