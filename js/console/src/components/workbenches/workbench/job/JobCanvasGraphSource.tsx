import {
  useWorkbenchJobLogsToolQuery,
  useWorkbenchJobMetricsSeriesToolQuery,
  useWorkbenchJobTracesToolQuery,
  WorkbenchJobLogsToolQuery,
  WorkbenchJobMetricsSeriesToolQuery,
  WorkbenchJobTracesToolQuery,
  WorkbenchToolQueryData,
} from 'generated/graphql'
import { ReactNode, useMemo } from 'react'
import {
  DashboardGraphSourceProvider,
  GraphDataArgs,
  GraphDataResult,
  GraphResult,
} from '../monitoring/DashboardGraphSource'
import { toolQueryArguments } from './workbenchJobTimeRange'

export type JobCanvasQueryType = 'metrics' | 'logs' | 'traces'

export type JobCanvasQuery = {
  type: JobCanvasQueryType
  query: Pick<WorkbenchToolQueryData, 'toolName' | 'toolArgs'>
}

// tool results are large and stored on the shared job entity, so caching them
// makes each response re-diff every other tool result on the page
const TOOL_RESULT_FETCH_POLICY = 'no-cache' as const

/**
 * Serves dashboard panel data for a job canvas by re-running each block's
 * stored tool query over the dashboard's time range.
 */
export function JobCanvasGraphSource({
  jobId,
  queries,
  children,
}: {
  jobId: string
  /** Tool queries keyed by panel identifier. */
  queries: Record<string, JobCanvasQuery>
  children: ReactNode
}) {
  const useGraphData = useMemo(
    () =>
      function useJobCanvasGraphData({
        identifier,
        timeRange,
        skip,
      }: GraphDataArgs): GraphDataResult {
        const entry = queries[identifier]
        const variables = useMemo(
          () => ({
            id: jobId,
            name: entry?.query.toolName?.trim(),
            arguments: toolQueryArguments(entry?.query.toolArgs, {
              start: new Date(timeRange.start),
              end: new Date(timeRange.end),
            }),
          }),
          [entry, timeRange.start, timeRange.end]
        )
        const options = (type: JobCanvasQueryType) => ({
          variables,
          skip: skip || entry?.type !== type,
          fetchPolicy: TOOL_RESULT_FETCH_POLICY,
        })
        const metrics = useWorkbenchJobMetricsSeriesToolQuery(
          options('metrics')
        )
        const logs = useWorkbenchJobLogsToolQuery(options('logs'))
        const traces = useWorkbenchJobTracesToolQuery(options('traces'))
        const active =
          entry?.type === 'logs'
            ? logs
            : entry?.type === 'traces'
              ? traces
              : metrics
        const data = useMemo(
          () => graphResult(metrics.data, logs.data, traces.data),
          [metrics.data, logs.data, traces.data]
        )
        const previousData = useMemo(
          () =>
            graphResult(
              metrics.previousData,
              logs.previousData,
              traces.previousData
            ),
          [metrics.previousData, logs.previousData, traces.previousData]
        )

        return {
          data,
          previousData,
          loading: active.loading,
          error: active.error,
        }
      },
    [jobId, queries]
  )

  return (
    <DashboardGraphSourceProvider
      useGraphData={useGraphData}
      readOnly
    >
      {children}
    </DashboardGraphSourceProvider>
  )
}

/** Only the panel's own query runs, so at most one of these is set. */
function graphResult(
  metrics: WorkbenchJobMetricsSeriesToolQuery | undefined,
  logs: WorkbenchJobLogsToolQuery | undefined,
  traces: WorkbenchJobTracesToolQuery | undefined
): GraphResult | undefined {
  if (metrics) return { series: metrics.workbenchJob?.metricsSeriesTool }
  if (logs) return { logs: logs.workbenchJob?.logsTool }
  if (traces) return { traces: traces.workbenchJob?.tracesTool }
  return undefined
}
