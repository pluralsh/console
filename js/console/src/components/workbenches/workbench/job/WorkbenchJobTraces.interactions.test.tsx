import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'
import {
  HonorableThemeProvider,
  styledThemeDark,
} from '@pluralsh/design-system'
import { TraceWaterfall } from './WorkbenchJobTraces'

// Graph layout requires browser measurements; these tests exercise the shared controls.
vi.mock('./WorkbenchJobTraceTopology', () => ({
  TraceTopology: ({ mode }: { mode: string }) => <div>{mode} graph</div>,
}))

afterEach(cleanup)

function renderTrace() {
  return render(
    <ThemeProvider theme={styledThemeDark}>
      <HonorableThemeProvider>
        <TraceWaterfall
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
      </HonorableThemeProvider>
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
})
