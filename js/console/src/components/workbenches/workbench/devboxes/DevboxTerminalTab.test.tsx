import { styledThemeDark } from '@pluralsh/design-system'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DevboxTerminalTab, terminalTitle } from './DevboxTerminalTab'

vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 80
    rows = 24
    loadAddon() {}
    open() {}
    write() {}
    onData = () => ({ dispose() {} })
    onResize = () => ({ dispose() {} })
    dispose() {}
  },
}))
vi.mock('@xterm/addon-webgl', () => ({
  WebglAddon: class {
    onContextLoss() {}
    dispose() {}
  },
}))
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit() {}
  },
}))

class FakeSocket {
  static OPEN = 1
  static instances: FakeSocket[] = []
  readyState = FakeSocket.OPEN
  binaryType = ''
  sent: unknown[] = []
  closed = false
  onopen?: () => void
  onmessage?: (e: { data: unknown }) => void
  onclose?: () => void
  constructor(public url: string) {
    FakeSocket.instances.push(this)
  }
  send(data: unknown) {
    this.sent.push(data)
  }
  close() {
    this.closed = true
  }
}

const INSTANCE = 'inst-1'

const renderTab = (openStream = vi.fn()) =>
  render(
    <ThemeProvider theme={styledThemeDark}>
      <DevboxTerminalTab
        instanceId={INSTANCE}
        api={{ openStream }}
        live
        headerActions={null}
      />
    </ThemeProvider>
  )

const tabs = () => screen.getAllByRole('tab').map((t) => t.textContent)

describe('DevboxTerminalTab sessions', () => {
  let ids = 0
  const openStream = vi.fn(async ({ terminalId }) => ({
    url: 'https://console.example.com/stream',
    token: 't',
    terminalId: terminalId ?? `term-${++ids}`,
  }))

  beforeEach(() => {
    ids = 0
    FakeSocket.instances = []
    sessionStorage.clear()
    openStream.mockClear()
    vi.stubGlobal('WebSocket', FakeSocket)
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  it('opens, switches and closes terminal sessions', async () => {
    renderTab(openStream)
    await act(async () => {})
    expect(tabs()).toEqual(['Terminal 1'])

    fireEvent.click(screen.getByLabelText('New terminal'))
    await act(async () => {})
    expect(tabs()).toEqual(['Terminal 1', 'Terminal 2'])
    expect(screen.getByRole('tab', { selected: true }).textContent).toBe(
      'Terminal 2'
    )
    expect(openStream).toHaveBeenCalledTimes(2)

    // closing ends the shell on the devbox, not just the socket
    const [first] = FakeSocket.instances
    fireEvent.click(screen.getByLabelText('Close Terminal 1'))
    expect(first.sent).toContainEqual(JSON.stringify({ type: 'close' }))
    expect(first.closed).toBe(true)
    expect(tabs()).toEqual(['Terminal 2'])

    // the last session is replaced rather than leaving the tab empty
    fireEvent.click(screen.getByLabelText('Close Terminal 2'))
    await act(async () => {})
    expect(tabs()).toEqual(['Terminal 3'])
  })

  it('reattaches to its shell after remounting', async () => {
    const { unmount } = renderTab(openStream)
    await act(async () => {})
    expect(openStream.mock.lastCall?.[0].terminalId).toBeFalsy()
    unmount()

    renderTab(openStream)
    await act(async () => {})
    expect(openStream).toHaveBeenLastCalledWith({
      kind: 'terminal',
      terminalId: 'term-1',
    })
  })
})

describe('terminalTitle', () => {
  it('names the shell, or the job it runs, with its directory', () => {
    expect(
      terminalTitle({ command: '/bin/zsh -l', cwd: '/home/devbox/console' })
    ).toEqual({ name: 'zsh', dir: 'console', cwd: '/home/devbox/console' })
    expect(
      terminalTitle({
        command: '/bin/zsh -l',
        foregroundCommand: '/usr/bin/vim main.go',
        cwd: '/',
      })
    ).toEqual({ name: 'vim', dir: '/', cwd: '/' })
    expect(terminalTitle({ cwd: '/home' })).toBeNull()
  })
})

describe('DevboxTerminalTab titles', () => {
  beforeEach(() => {
    FakeSocket.instances = []
    sessionStorage.clear()
    vi.stubGlobal('WebSocket', FakeSocket)
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  it('relabels a session from its info frames', async () => {
    renderTab(
      vi.fn(async () => ({
        url: 'https://x/stream',
        token: 't',
        terminalId: 'a',
      }))
    )
    await act(async () => {})
    expect(tabs()).toEqual(['Terminal 1'])

    const [socket] = FakeSocket.instances
    const info = (cwd: string) =>
      act(() =>
        socket.onmessage?.({
          data: JSON.stringify({
            type: 'info',
            terminalId: 'a',
            command: '/bin/zsh -l',
            cwd,
          }),
        })
      )
    info('/home/devbox')
    expect(tabs()).toEqual(['zshdevbox'])
    info('/home/devbox/console')
    expect(tabs()).toEqual(['zshconsole'])
    expect(screen.getByRole('tab').getAttribute('title')).toBe(
      '/home/devbox/console'
    )
  })
})
