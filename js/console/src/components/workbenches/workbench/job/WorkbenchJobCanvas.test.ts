import { describe, expect, it } from 'vitest'
import { WorkbenchCanvasToolGraph } from 'generated/graphql'
import { getToolGraphSummaries } from './WorkbenchJobCanvas'

function graph(
  overrides: Partial<WorkbenchCanvasToolGraph>
): WorkbenchCanvasToolGraph {
  return overrides
}

describe('getToolGraphSummaries', () => {
  it('renders an identical query and graph summary once', () => {
    expect(
      getToolGraphSummaries(
        graph({
          query: { summary: 'The query found no errors.' },
          summary: 'The query found no errors.',
        })
      )
    ).toEqual({
      graphSummary: 'The query found no errors.',
      hasDistinctQuerySummary: false,
      querySummary: 'The query found no errors.',
    })
  })

  it('keeps different query and graph summaries', () => {
    expect(
      getToolGraphSummaries(
        graph({
          query: { summary: 'The query found no errors.' },
          summary: 'No action is required.',
        })
      )
    ).toMatchObject({
      graphSummary: 'No action is required.',
      hasDistinctQuerySummary: true,
      querySummary: 'The query found no errors.',
    })
  })
})
