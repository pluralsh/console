import { act, render } from '@testing-library/react'
import { ReactNode, useEffect } from 'react'
import {
  MemoryRouter,
  NavigateFunction,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import { getAgentRunAbsPath } from 'routes/aiRoutesConsts'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import { describe, expect, it, vi } from 'vitest'
import {
  SidePanel,
  SidePanelAutoOpen,
  TopLevelSidePanelProvider,
  useSidePanelAutoOpen,
  useTopLevelSidePanel,
} from './TopLevelSidePanelState'

vi.mock('components/ai/useLegacyAiChatEnabled', () => ({
  useLegacyAiChatEnabled: () => false,
}))

const JOB_PATH = getWorkbenchJobAbsPath({ workbenchId: 'w', jobId: 'j' })
const RUN_PATH = getAgentRunAbsPath({ agentRunId: 'r' })

type Harness = {
  sidePanel: () => SidePanel | null
  navigate: (to: string | number) => void
  close: (panel: SidePanel) => void
  rerender: (pages: Pages) => void
}

type Pages = {
  job?: Nullable<SidePanelAutoOpen>
  run?: Nullable<SidePanelAutoOpen>
}

function Page({
  panel,
  autoOpen,
}: {
  panel: SidePanel
  autoOpen: Nullable<SidePanelAutoOpen>
}) {
  useSidePanelAutoOpen(panel, autoOpen)
  return null
}

function setup(initialPath: string, pages: Pages): Harness {
  const state: {
    sidePanel: SidePanel | null
    navigate?: NavigateFunction
    close?: (panel: SidePanel) => void
  } = { sidePanel: null }

  function Probe() {
    const { sidePanel, closeSidePanel } = useTopLevelSidePanel()
    const navigate = useNavigate()
    useEffect(() => {
      Object.assign(state, { sidePanel, close: closeSidePanel, navigate })
    })
    return null
  }

  const tree = (p: Pages): ReactNode => (
    <MemoryRouter initialEntries={[initialPath]}>
      <TopLevelSidePanelProvider>
        <Probe />
        <Routes>
          <Route
            path="/workbenches/:workbenchId/jobs/:jobId"
            element={
              <Page
                panel="workbench-job"
                autoOpen={p.job}
              />
            }
          />
          <Route
            path="/ai/agent-runs/:runId"
            element={
              <Page
                panel="agent-run"
                autoOpen={p.run}
              />
            }
          />
          <Route
            path="*"
            element={null}
          />
        </Routes>
      </TopLevelSidePanelProvider>
    </MemoryRouter>
  )

  const { rerender } = render(tree(pages))

  return {
    sidePanel: () => state.sidePanel,
    navigate: (to) => act(() => void state.navigate?.(to as string)),
    close: (panel) => act(() => state.close?.(panel)),
    rerender: (p) => rerender(tree(p)),
  }
}

const withContent = (key: string): SidePanelAutoOpen => ({
  hasContent: true,
  key,
})

describe('useSidePanelAutoOpen', () => {
  it('reopens the job panel after navigating to a run and back', () => {
    const h = setup(JOB_PATH, {
      job: withContent('j'),
      run: withContent('r'),
    })
    expect(h.sidePanel()).toBe('workbench-job')

    h.navigate(RUN_PATH)
    expect(h.sidePanel()).toBe('agent-run')

    h.navigate(-1)
    expect(h.sidePanel()).toBe('workbench-job')

    h.navigate(1)
    expect(h.sidePanel()).toBe('agent-run')
  })

  it('opens the run panel when content arrives after navigating from a job', () => {
    const pages: Pages = {
      job: withContent('j'),
      run: { hasContent: false, loading: true, key: 'r' },
    }
    const h = setup(JOB_PATH, pages)

    h.navigate(RUN_PATH)
    expect(h.sidePanel()).toBeNull()

    h.rerender({ ...pages, run: withContent('r') })
    expect(h.sidePanel()).toBe('agent-run')
  })

  it('stays open while loading and closes only once loaded without content', () => {
    const h = setup(JOB_PATH, { job: withContent('j') })
    expect(h.sidePanel()).toBe('workbench-job')

    h.rerender({ job: { hasContent: false, loading: true, key: 'j2' } })
    expect(h.sidePanel()).toBe('workbench-job')

    h.rerender({ job: withContent('j2') })
    expect(h.sidePanel()).toBe('workbench-job')

    h.rerender({ job: { hasContent: false, key: 'j3' } })
    expect(h.sidePanel()).toBeNull()
  })

  it('keeps a manual close until the content state or key changes', () => {
    const h = setup(JOB_PATH, { job: withContent('j') })
    h.close('workbench-job')
    expect(h.sidePanel()).toBeNull()

    h.rerender({ job: withContent('j') })
    expect(h.sidePanel()).toBeNull()

    h.rerender({ job: withContent('j2') })
    expect(h.sidePanel()).toBe('workbench-job')
  })

  it("doesn't close another page's panel", () => {
    const h = setup(JOB_PATH, { job: withContent('j') })
    h.close('agent-run')
    expect(h.sidePanel()).toBe('workbench-job')
  })

  it('closes the panel when leaving to a page without one', () => {
    const h = setup(JOB_PATH, { job: withContent('j') })
    h.navigate('/somewhere-else')
    expect(h.sidePanel()).toBeNull()

    h.navigate(-1)
    expect(h.sidePanel()).toBe('workbench-job')
  })
})
