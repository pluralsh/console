import {
  useWorkbenchJobLogsToolQuery,
  useWorkbenchJobMetricsSeriesToolQuery,
  useWorkbenchJobTracesToolQuery,
  WorkbenchJobLogsToolQuery,
  WorkbenchJobMetricsSeriesToolQuery,
  WorkbenchJobTracesToolQuery,
  WorkbenchToolQueryData,
} from 'generated/graphql'
import type {
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

export type JobCanvasGraphQueries = {
  jobId: string
  /** Tool queries keyed by panel identifier. */
  queries: Record<string, JobCanvasQuery>
}

// tool results are large and stored on the shared job entity, so caching them
// makes each response re-diff every other tool result on the page
const TOOL_RESULT_FETCH_POLICY = 'no-cache' as const

/**
 * Serves dashboard panel data for a job canvas by re-running each block's
 * stored tool query over the dashboard's time range. Skipped without `job`.
 */
export function useJobCanvasGraphData(
  job: JobCanvasGraphQueries | undefined,
  { identifier, timeRange, skip }: GraphDataArgs
): GraphDataResult {
  const entry = job?.queries[identifier]
  const variables = {
    id: job?.jobId ?? '',
    name: entry?.query.toolName?.trim(),
    arguments: toolQueryArguments(entry?.query.toolArgs, {
      start: new Date(timeRange.start),
      end: new Date(timeRange.end),
    }),
  }
  const options = (type: JobCanvasQueryType) => ({
    variables,
    skip: skip || !job || entry?.type !== type,
    fetchPolicy: TOOL_RESULT_FETCH_POLICY,
  })
  const metrics = useWorkbenchJobMetricsSeriesToolQuery(options('metrics'))
  const logs = useWorkbenchJobLogsToolQuery(options('logs'))
  const traces = useWorkbenchJobTracesToolQuery(options('traces'))
  const active =
    entry?.type === 'logs' ? logs : entry?.type === 'traces' ? traces : metrics

  return {
    data: graphResult(metrics.data, logs.data, traces.data),
    previousData: graphResult(
      metrics.previousData,
      logs.previousData,
      traces.previousData
    ),
    loading: active.loading,
    error: active.error,
  }
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
