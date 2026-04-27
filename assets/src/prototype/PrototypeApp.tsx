import {
  Button,
  Card,
  Chip,
  GlobalStyle,
  HonorableThemeProvider,
  Input,
  styledThemeDark,
  styledThemeLight,
  useThemeColorMode,
} from '@pluralsh/design-system'
import { ReactNode, useMemo, useState } from 'react'
import { createBrowserRouter, Link, RouterProvider } from 'react-router-dom'
import {
  StyleSheetManager,
  ThemeProvider as StyledThemeProvider,
  useTheme,
} from 'styled-components'

import { shouldForwardProp } from 'utils/shouldForwardProp'

type TraceStatus = 'healthy' | 'warning' | 'error'

type Trace = {
  id: string
  name: string
  service: string
  environment: string
  durationMs: number
  status: TraceStatus
  startedAt: string
}

const MOCK_TRACES: Trace[] = [
  {
    id: 'trc-9f6d',
    name: 'Checkout flow',
    service: 'payments-api',
    environment: 'production',
    durationMs: 842,
    status: 'warning',
    startedAt: '2m ago',
  },
  {
    id: 'trc-8ac1',
    name: 'Provision stack run',
    service: 'stack-runner',
    environment: 'staging',
    durationMs: 1243,
    status: 'healthy',
    startedAt: '6m ago',
  },
  {
    id: 'trc-44be',
    name: 'Deploy service',
    service: 'cd-controller',
    environment: 'production',
    durationMs: 1988,
    status: 'error',
    startedAt: '14m ago',
  },
]

const router = createBrowserRouter([
  {
    path: '/',
    element: <TraceListPage />,
  },
  {
    path: '/trace/:id',
    element: <TraceDetailsPage />,
  },
])

export default function PrototypeApp() {
  return (
    <PrototypeThemeProviders>
      <RouterProvider router={router} />
    </PrototypeThemeProviders>
  )
}

function PrototypeThemeProviders({ children }: { children: ReactNode }) {
  const colorMode = useThemeColorMode()
  const styledTheme = colorMode === 'light' ? styledThemeLight : styledThemeDark

  return (
    <StyleSheetManager shouldForwardProp={shouldForwardProp}>
      <StyledThemeProvider theme={styledTheme}>
        <HonorableThemeProvider>
          <GlobalStyle />
          {children}
        </HonorableThemeProvider>
      </StyledThemeProvider>
    </StyleSheetManager>
  )
}

function TraceListPage() {
  const theme = useTheme()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | TraceStatus>('all')

  const filteredTraces = useMemo(() => {
    return MOCK_TRACES.filter((trace) => {
      const statusMatch =
        activeFilter === 'all' || trace.status === activeFilter
      const textMatch =
        search.trim().length === 0 ||
        trace.name.toLowerCase().includes(search.toLowerCase()) ||
        trace.service.toLowerCase().includes(search.toLowerCase())
      return statusMatch && textMatch
    })
  }, [activeFilter, search])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: theme.colors['fill-two'],
        color: theme.colors.text,
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: 24 }}>
        <div style={{ marginBottom: 8, color: theme.colors['text-xlight'] }}>
          Prototype / Trace visualization
        </div>
        <h1 style={{ marginTop: 12, marginBottom: 8 }}>
          Trace Visualization UX Lab
        </h1>
        <p
          style={{
            marginTop: 0,
            marginBottom: 16,
            color: theme.colors['text-xlight'],
          }}
        >
          UI-only environment with mock data. Use this to iterate on information
          architecture, table layouts, and details drilldowns without backend
          wiring.
        </p>
        <Card padding="medium">
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <Input
              placeholder="Search traces or services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              secondary={activeFilter !== 'all'}
              onClick={() => setActiveFilter('all')}
            >
              All
            </Button>
            <Button
              secondary={activeFilter !== 'healthy'}
              onClick={() => setActiveFilter('healthy')}
            >
              Healthy
            </Button>
            <Button
              secondary={activeFilter !== 'warning'}
              onClick={() => setActiveFilter('warning')}
            >
              Warning
            </Button>
            <Button
              secondary={activeFilter !== 'error'}
              onClick={() => setActiveFilter('error')}
            >
              Error
            </Button>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {filteredTraces.map((trace) => (
              <Link
                key={trace.id}
                to={`/trace/${trace.id}`}
                style={{ textDecoration: 'none' }}
              >
                <Card padding="medium">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{trace.name}</div>
                      <div
                        style={{
                          color: theme.colors['text-xlight'],
                          marginTop: 4,
                        }}
                      >
                        {trace.service} · {trace.environment} ·{' '}
                        {trace.startedAt}
                      </div>
                    </div>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <Chip severity={statusChipSeverity(trace.status)}>
                        {trace.status}
                      </Chip>
                      <span style={{ color: theme.colors['text-light'] }}>
                        {trace.durationMs} ms
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function TraceDetailsPage() {
  const theme = useTheme()
  const trace = MOCK_TRACES[0]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: theme.colors['fill-two'],
        color: theme.colors.text,
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: 24 }}>
        <Link
          to="/"
          style={{ color: theme.colors['text-xlight'], textDecoration: 'none' }}
        >
          ← Back to prototype traces
        </Link>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 12,
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>{trace.name}</h1>
            <p style={{ marginTop: 6, color: theme.colors['text-xlight'] }}>
              {trace.service} · {trace.environment}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button secondary>Share link</Button>
            <Button>Replay flow</Button>
          </div>
        </div>
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 12,
          }}
        >
          <Card padding="medium">
            <h3 style={{ marginTop: 0 }}>Timeline</h3>
            <TimelineRow
              name="Gateway ingress"
              durationMs={79}
              status="healthy"
            />
            <TimelineRow
              name="Auth check"
              durationMs={211}
              status="warning"
            />
            <TimelineRow
              name="Policy evaluation"
              durationMs={322}
              status="healthy"
            />
            <TimelineRow
              name="Database write"
              durationMs={510}
              status="error"
            />
          </Card>
          <Card padding="medium">
            <h3 style={{ marginTop: 0 }}>Experiment panel</h3>
            <p style={{ color: theme.colors['text-xlight'] }}>
              Use this panel to test copy, hierarchy, and action placement.
            </p>
            <Button
              secondary
              width="100%"
              marginBottom="small"
            >
              Toggle compact mode
            </Button>
            <Button width="100%">Open annotation mode</Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

function TimelineRow({
  name,
  durationMs,
  status,
}: {
  name: string
  durationMs: number
  status: TraceStatus
}) {
  const theme = useTheme()

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderTop: `1px solid ${theme.colors.border}`,
      }}
    >
      <div>{name}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Chip severity={statusChipSeverity(status)}>{status}</Chip>
        <span style={{ color: theme.colors['text-light'] }}>
          {durationMs} ms
        </span>
      </div>
    </div>
  )
}

function statusChipSeverity(
  status: TraceStatus
): 'success' | 'warning' | 'danger' {
  if (status === 'healthy') return 'success'
  if (status === 'warning') return 'warning'
  return 'danger'
}
