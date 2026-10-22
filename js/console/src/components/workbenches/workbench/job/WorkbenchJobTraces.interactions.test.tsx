import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { ThemeProvider } from 'styled-components'
import { styledThemeDark } from '@pluralsh/design-system'
import type { ComponentProps } from 'react'
import { TraceWaterfall } from './WorkbenchJobTraces'

// Graph layout requires browser measurements; these tests exercise the shared controls.
vi.mock('./WorkbenchJobTraceTopology', () => ({
  TraceTopology: ({ mode }: { mode: string }) => <div>{mode} graph</div>,
}))

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
})
afterAll(() => vi.unstubAllGlobals())
afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderTrace(
  fullscreenControl?: ComponentProps<typeof TraceWaterfall>['fullscreenControl']
) {
  return render(
    <ThemeProvider theme={styledThemeDark}>
      <TraceWaterfall
        fullscreenControl={fullscreenControl}
        traces={[
          {
            traceId: 'trace',
            spanId: 'root',
            name: 'GET /example',
            service: 'console',
            start: '2026-09-07T08:00:00Z',
            end: '2026-09-07T08:00:01Z',
            tags: { 'http.status_code': 503 },
          },
        ]}
      />
    </ThemeProvider>
  )
}

describe('trace view interactions', () => {
  it('opens span details in the expanded view and removes them on exit', async () => {
    renderTrace()
    expect(screen.getByRole('radiogroup', { name: 'Trace view' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /GET \/example/ }))
    expect(
      screen.getByRole('dialog', { name: 'Trace visualization' })
    ).toBeTruthy()
    expect(screen.getByText('Attributes')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Exit full screen' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.queryByText('Attributes')).toBeNull()
    expect(screen.getByRole('button', { name: 'Full screen' })).toBeTruthy()
  })

  it('keeps fullscreen open when switching between graph modes', () => {
    renderTrace()
    fireEvent.click(screen.getByRole('radio', { name: 'Span graph' }))
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Service graph' }))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('services graph')).toBeTruthy()
  })

  it('leaves full screen to a container that controls it', () => {
    const onOpenChange = vi.fn()
    const { rerender } = renderTrace({ open: false, onOpenChange })

    expect(screen.queryByRole('button', { name: 'Full screen' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /GET \/example/ }))
    expect(onOpenChange).toHaveBeenCalledWith(true)

    rerender(
      <ThemeProvider theme={styledThemeDark}>
        <TraceWaterfall
          fullscreenControl={{ open: true, onOpenChange, title: 'Requests' }}
          traces={[
            {
              traceId: 'trace',
              spanId: 'root',
              name: 'GET /example',
              service: 'console',
              start: '2026-09-07T08:00:00Z',
              end: '2026-09-07T08:00:01Z',
            },
          ]}
        />
      </ThemeProvider>
    )
    expect(screen.getByRole('dialog', { name: 'Requests' })).toBeTruthy()
  })

  it('widens the span list with nesting and stops at a max width', () => {
    renderTrace()
    const spanList = () =>
      screen.getByRole('separator', { name: 'Span list width' })
    expect(spanList().getAttribute('aria-valuenow')).toBe('256')
    expect(spanList().getAttribute('aria-valuemax')).toBe('560')
    expect(spanList().getAttribute('aria-valuemin')).toBe('200')

    cleanup()
    localStorage.clear()
    render(traceElement(nestedSpans(4)))
    expect(spanList().getAttribute('aria-valuenow')).toBe('336')

    cleanup()
    localStorage.clear()
    render(traceElement(nestedSpans(30)))
    expect(spanList().getAttribute('aria-valuenow')).toBe('560')

    fireEvent.keyDown(spanList(), { key: 'ArrowRight' })
    expect(spanList().getAttribute('aria-valuenow')).toBe('560')
    fireEvent.keyDown(spanList(), { key: 'ArrowLeft' })
    expect(spanList().getAttribute('aria-valuenow')).toBe('550')

    for (let step = 0; step < 40; step++)
      fireEvent.keyDown(spanList(), { key: 'ArrowLeft' })
    expect(spanList().getAttribute('aria-valuenow')).toBe('200')
  })

  it('stops resizing when a drag is interrupted', () => {
    renderTrace()
    const spanList = () =>
      screen.getByRole('separator', { name: 'Span list width' })

    fireEvent.pointerDown(spanList(), { clientX: 0, pointerId: 1 })
    fireEvent.pointerMove(spanList(), { clientX: 32, pointerId: 1 })
    const dragged = spanList().getAttribute('aria-valuenow')
    expect(dragged).toBe('288')

    fireEvent.pointerCancel(spanList(), { pointerId: 1 })
    fireEvent.pointerMove(spanList(), { clientX: 80, pointerId: 1 })
    expect(spanList().getAttribute('aria-valuenow')).toBe(dragged)

    fireEvent.pointerDown(spanList(), { clientX: 80, pointerId: 1 })
    fireEvent.pointerMove(spanList(), { clientX: 96, pointerId: 1 })
    const again = spanList().getAttribute('aria-valuenow')
    fireEvent.lostPointerCapture(spanList())
    fireEvent.pointerMove(spanList(), { clientX: 160, pointerId: 1 })
    expect(spanList().getAttribute('aria-valuenow')).toBe(again)
  })
})

function traceElement(traces: ComponentProps<typeof TraceWaterfall>['traces']) {
  return (
    <ThemeProvider theme={styledThemeDark}>
      <TraceWaterfall traces={traces} />
    </ThemeProvider>
  )
}

function nestedSpans(depth: number) {
  return Array.from({ length: depth + 1 }, (_, index) => ({
    traceId: 'trace',
    spanId: `span-${index}`,
    parentId: index === 0 ? null : `span-${index - 1}`,
    name: `span ${index}`,
    service: 'console',
    start: '2026-09-07T08:00:00Z',
    end: '2026-09-07T08:00:01Z',
  }))
}
