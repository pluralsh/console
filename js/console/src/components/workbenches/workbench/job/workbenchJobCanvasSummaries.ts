import { WorkbenchCanvasToolGraph } from 'generated/graphql'

export function getToolGraphSummaries(
  graph: Nullable<WorkbenchCanvasToolGraph>
) {
  const querySummary = graph?.query?.summary?.trim() || undefined
  const graphSummary = graph?.summary?.trim() || undefined

  return {
    graphSummary,
    querySummary,
    hasDistinctQuerySummary: !!querySummary && querySummary !== graphSummary,
  }
}
