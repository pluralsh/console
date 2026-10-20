import {
  DashboardGraphType,
  WorkbenchCanvasBlockFragment,
  WorkbenchCanvasBlockType,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import { canvasPanels } from './workbenchJobCanvasPanels'

const layout = { x: 0, y: 0, w: 3, h: 4 }

describe('canvasPanels', () => {
  it('maps sections, descriptions and tool queries onto dashboard panels', () => {
    const query = { toolName: 'prom', toolArgs: { query: 'up' } }
    const blocks: WorkbenchCanvasBlockFragment[] = [
      {
        identifier: 'errors',
        type: WorkbenchCanvasBlockType.Section,
        title: 'Errors',
        description: 'Where the 500s come from',
        collapsed: true,
        layout: { x: 0, y: 1, w: 1, h: 1 },
      },
      {
        identifier: 'rate',
        type: WorkbenchCanvasBlockType.Metrics,
        sectionId: 'errors',
        layout,
        content: {
          metrics: { title: '5xx ratio', summary: 'Ratio of 5xx', query },
        },
      },
      {
        identifier: 'notes',
        type: WorkbenchCanvasBlockType.Markdown,
        description: 'Ignored by markdown panels',
        layout,
        content: { markdown: '# Notes' },
      },
    ]

    const { graphs, queries } = canvasPanels(blocks)

    expect(graphs).toMatchObject([
      {
        identifier: 'errors',
        type: DashboardGraphType.Section,
        title: 'Errors',
        description: 'Where the 500s come from',
        options: { collapsed: true },
        layout: { x: 0, y: 1, w: 1, h: 1 },
      },
      {
        identifier: 'rate',
        type: DashboardGraphType.Timeseries,
        sectionId: 'errors',
        title: '5xx ratio',
        description: 'Ratio of 5xx',
        hasDatasource: true,
      },
      {
        identifier: 'notes',
        type: DashboardGraphType.Markdown,
        markdown: '# Notes',
      },
    ])
    expect(queries).toEqual({ rate: { type: 'metrics', query } })
  })

  it('prefers an explicit block description over tool summaries', () => {
    const { graphs, queries } = canvasPanels([
      {
        identifier: 'logs',
        type: WorkbenchCanvasBlockType.Logs,
        description: 'Explicit',
        layout,
        content: { logs: { title: 'Errors', summary: 'Summary' } },
      },
    ])

    expect(graphs[0]).toMatchObject({
      type: DashboardGraphType.Logs,
      description: 'Explicit',
      hasDatasource: false,
    })
    expect(queries).toEqual({})
  })
})
