import { styledThemeDark } from '@pluralsh/design-system'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SimpleToastProvider } from 'components/utils/SimpleToastContext'
import { TopLevelSidePanelProvider } from 'components/layout/TopLevelSidePanelState'
import { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DevboxBrowserView } from './DevboxBrowserTab'
import { useDevboxPanel } from './DevboxControlPanel'
import { DevboxWorkspaceApi } from './devboxWorkspaceApi'

vi.mock('components/ai/useLegacyAiChatEnabled', () => ({
  useLegacyAiChatEnabled: () => false,
}))

const rfb = vi.hoisted(() => ({
  instances: [] as {
    url: string
    viewOnly: boolean
    focused: boolean
    disconnect: () => void
    focus: () => void
  }[],
}))

vi.mock('@novnc/novnc/lib/rfb', () => ({
  default: class {
    scaleViewport = false
    resizeSession = true
    viewOnly = true
    focused = false
    constructor(
      _target: HTMLElement,
      public url: string
    ) {
      rfb.instances.push(this)
    }
    addEventListener(name: string, fn: () => void) {
      if (name === 'connect') fn()
    }
    disconnect() {}
    focus() {
      this.focused = true
    }
  },
}))

const openStream = vi.fn(async () => ({
  url: 'https://console.example.com/ext/devbox/streams/s1',
  token: 'tok',
}))

const api = { openStream } as unknown as DevboxWorkspaceApi

function renderView(
  props: Partial<{
    live: boolean
    browserEnabled: boolean
    api: DevboxWorkspaceApi
    onClose: () => void
  }> = {}
) {
  return render(
    <ThemeProvider theme={styledThemeDark}>
      <SimpleToastProvider>
        <DevboxBrowserView
          api={props.api ?? api}
          live={props.live ?? true}
          browserEnabled={props.browserEnabled ?? true}
          onClose={props.onClose ?? vi.fn()}
        />
      </SimpleToastProvider>
    </ThemeProvider>
  )
}

describe('DevboxBrowserView', () => {
  const requestFullscreen = vi.fn(() => Promise.resolve())

  beforeEach(() => {
    rfb.instances = []
    openStream.mockClear()
    requestFullscreen.mockClear()
    HTMLElement.prototype.requestFullscreen = requestFullscreen
  })

  it('opens a vnc stream and starts in control', async () => {
    renderView()
    await waitFor(() =>
      expect(openStream).toHaveBeenCalledWith({ kind: 'vnc' })
    )
    await waitFor(() => expect(rfb.instances).toHaveLength(1))
    expect(rfb.instances[0].url).toContain('token=tok')
    expect(rfb.instances[0].viewOnly).toBe(false)
    expect(screen.getByText('connected')).toBeTruthy()
  })

  it('returns to the session', () => {
    const onClose = vi.fn()
    renderView({ onClose, browserEnabled: false })
    fireEvent.click(screen.getByRole('button', { name: 'Back to session' }))
    expect(onClose).toHaveBeenCalled()
    expect(openStream).not.toHaveBeenCalled()
  })

  it('clears the browser view', async () => {
    function Harness() {
      const { browserOpen, openBrowser, closeBrowser } = useDevboxPanel()
      return (
        <>
          <button onClick={openBrowser}>Open browser</button>
          <span>{browserOpen ? 'browser' : 'session'}</span>
          {browserOpen && (
            <DevboxBrowserView
              api={api}
              live
              browserEnabled
              onClose={closeBrowser}
            />
          )}
        </>
      )
    }
    render(shell(<Harness />))
    fireEvent.click(screen.getByRole('button', { name: 'Open browser' }))
    expect(screen.getByText('browser')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back to session' }))
    expect(screen.getByText('session')).toBeTruthy()
  })

  it('requests fullscreen and focuses the session', async () => {
    renderView()
    await waitFor(() => expect(rfb.instances).toHaveLength(1))
    fireEvent.click(screen.getByRole('button', { name: 'View fullscreen' }))
    await waitFor(() => expect(requestFullscreen).toHaveBeenCalled())
    await waitFor(() => expect(rfb.instances[0].focused).toBe(true))
  })

  it('explains a box without a browser', () => {
    renderView({ browserEnabled: false })
    expect(screen.getByText(/doesn't run a browser/)).toBeTruthy()
    expect(openStream).not.toHaveBeenCalled()
  })

  it('explains an instance that is not running', () => {
    renderView({ live: false })
    expect(screen.getByText("Instance isn't running")).toBeTruthy()
    expect(openStream).not.toHaveBeenCalled()
  })

  it('explains when streams are unavailable', () => {
    renderView({ api: {} })
    expect(screen.getByText('Browser unavailable')).toBeTruthy()
  })
})

function shell(node: ReactNode) {
  return (
    <ThemeProvider theme={styledThemeDark}>
      <SimpleToastProvider>
        <MemoryRouter>
          <TopLevelSidePanelProvider>{node}</TopLevelSidePanelProvider>
        </MemoryRouter>
      </SimpleToastProvider>
    </ThemeProvider>
  )
}
