import {
  absoluteRange,
  DEFAULT_TIME_RANGE,
  TIME_RANGE_PRESETS,
  type TimeRange,
  type TimeWindow,
} from 'components/utils/timerange/timeRange'
import { WorkbenchToolQueryData } from 'generated/graphql'

type ToolArgs = WorkbenchToolQueryData['toolArgs']

const MAX_TOOL_RANGE_MS = 7 * 24 * 60 * 60 * 1000

/** Observability tools reject windows longer than a week. */
export const JOB_TIME_RANGE_PRESETS = TIME_RANGE_PRESETS.filter(
  ({ durationMs }) => durationMs <= MAX_TOOL_RANGE_MS
)

/** The `time_range` an observability tool call was made with, if valid. */
export function toolArgsTimeWindow(args: ToolArgs): TimeWindow | null {
  const timeRange = args?.time_range
  if (!timeRange || typeof timeRange !== 'object') return null
  const { start, end } = timeRange as Record<string, unknown>
  if (typeof start !== 'string' || typeof end !== 'string') return null
  const window = { start: new Date(start), end: new Date(end) }
  if (
    Number.isNaN(window.start.getTime()) ||
    Number.isNaN(window.end.getTime())
  )
    return null
  return window
}

/**
 * The window spanning every query's `time_range`, falling back to the tools'
 * server-side default (the past hour) when no query sets one.
 */
export function definedJobTimeRange(args: ToolArgs[]): TimeRange {
  const windows = args.map(toolArgsTimeWindow).filter((w) => w !== null)
  if (windows.length === 0) return DEFAULT_TIME_RANGE
  const start = Math.min(...windows.map((w) => w.start.getTime()))
  const end = Math.max(...windows.map((w) => w.end.getTime()))
  return absoluteRange(new Date(start), new Date(end))
}

/** The `arguments` variable for a job tool query, with `time_range` set to `window`. */
export function toolQueryArguments(
  args: ToolArgs,
  window: Nullable<TimeWindow>
) {
  const next = withToolTimeWindow(args, window)
  return next ? JSON.stringify(next) : undefined
}

/** Tool args with `time_range` replaced by `window`; unchanged when `window` is null. */
export function withToolTimeWindow(
  args: ToolArgs,
  window: Nullable<TimeWindow>
): ToolArgs {
  if (!window || !args) return args
  return {
    ...args,
    time_range: {
      start: window.start.toISOString(),
      end: window.end.toISOString(),
    },
  }
}
