import { styledThemeDark } from '@pluralsh/design-system'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'

import { DevboxBrowserView, rfbConstructor } from './DevboxBrowserTab'
import { DevboxWorkspaceApi } from './devboxWorkspaceApi'

const rfb = vi.hoisted(() => ({
  connects: true,
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
      if (name === 'connect' && rfb.connects) fn()
    }
    disconnect() {}
    focus() {
      this.focused = true
    }
  },
}))

const voxl = vi.hoisted(() => ({
  urls: [] as { url: string; protocols: string[] }[],
}))

vi.mock('./voxlClient', () => ({
  VOXL_SUBPROTOCOL: 'voxl',
  connectVoxl: (
    _target: HTMLElement,
    url: string,
    protocols: string[],
    { onConnect }: { onConnect: () => void }
  ) => {
    voxl.urls.push({ url, protocols })
    onConnect()
    return { disconnect() {}, focus() {} }
  },
}))

const openStream = vi.fn(
  async (): Promise<{
    url: string
    token: string
    subprotocols?: string[]
  }> => ({
    url: 'https://console.example.com/ext/devbox/streams/s1',
    token: 'tok',
  })
)

const api = { openStream } as unknown as DevboxWorkspaceApi

const onMove = vi.fn()

function renderView({
  view = api,
  live = true,
  placement = 'panel',
}: {
  view?: DevboxWorkspaceApi
  live?: boolean
  placement?: 'panel' | 'main'
} = {}) {
  return render(
    <ThemeProvider theme={styledThemeDark}>
      <DevboxBrowserView
        api={view}
        live={live}
        placement={placement}
        onMove={onMove}
      />
    </ThemeProvider>
  )
}

describe('DevboxBrowserView', () => {
  const requestFullscreen = vi.fn(() => Promise.resolve())

  beforeEach(() => {
    rfb.instances = []
    rfb.connects = true
    voxl.urls = []
    openStream.mockClear()
    onMove.mockClear()
    requestFullscreen.mockClear()
    HTMLElement.prototype.requestFullscreen = requestFullscreen
  })

  it('shows the browser in control, with no controls in the way', async () => {
    renderView()
    await waitFor(() =>
      expect(openStream).toHaveBeenCalledWith({ kind: 'vnc' })
    )
    await waitFor(() => expect(rfb.instances).toHaveLength(1))
    expect(rfb.instances[0].url).toContain('token=tok')
    expect(rfb.instances[0].viewOnly).toBe(false)
    await waitFor(() =>
      expect(screen.queryByText(/Starting the box's browser/)).toBeNull()
    )
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('switch')).toBeNull()
  })

  it('streams with voxl when the ticket carries its subprotocol', async () => {
    openStream.mockResolvedValueOnce({
      url: 'https://console.example.com/ext/devbox/streams/s1',
      token: 'tok',
      subprotocols: ['voxl'],
    })
    renderView()
    await waitFor(() => expect(voxl.urls).toHaveLength(1))
    expect(voxl.urls[0].url).toContain('token=tok')
    expect(voxl.urls[0].protocols).toEqual(['voxl'])
    expect(rfb.instances).toHaveLength(0)
    await waitFor(() =>
      expect(screen.queryByText(/Starting the box's browser/)).toBeNull()
    )
  })

  it('says why the browser could not be reached, and reconnects', async () => {
    openStream.mockRejectedValueOnce(
      new Error('chromium exited (exit status 1): No usable sandbox!')
    )
    renderView()
    expect(await screen.findByText(/No usable sandbox!/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect' }))
    await waitFor(() => expect(openStream).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(rfb.instances).toHaveLength(1))
  })

  it('shows the browser starting until it connects', async () => {
    rfb.connects = false
    renderView()
    await waitFor(() => expect(rfb.instances).toHaveLength(1))
    expect(screen.getByText(/Starting the box's browser/)).toBeTruthy()
  })

  it('requests fullscreen and focuses the session', async () => {
    renderView()
    await waitFor(() => expect(rfb.instances).toHaveLength(1))
    fireEvent.click(
      await screen.findByRole('button', { name: 'View fullscreen' })
    )
    await waitFor(() => expect(requestFullscreen).toHaveBeenCalled())
    await waitFor(() => expect(rfb.instances[0].focused).toBe(true))
  })

  it('moves from the sidebar to the main view', async () => {
    renderView()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open in main view' })
    )
    expect(onMove).toHaveBeenCalledTimes(1)
  })

  it('moves from the main view back to the sidebar', async () => {
    renderView({ placement: 'main' })
    fireEvent.click(
      await screen.findByRole('button', { name: 'Move to sidebar' })
    )
    expect(onMove).toHaveBeenCalledTimes(1)
    expect(
      screen.queryByRole('button', { name: 'Open in main view' })
    ).toBeNull()
  })

  it('asks to resume a suspended box', () => {
    renderView({ live: false })
    expect(screen.getByText("Instance isn't running")).toBeTruthy()
    expect(openStream).not.toHaveBeenCalled()
  })

  it('finds the client class however the CommonJS module is wrapped', () => {
    class Client {}
    expect(rfbConstructor({ default: Client })).toBe(Client)
    expect(rfbConstructor({ default: { default: Client } })).toBe(Client)
    expect(() => rfbConstructor({ default: {} })).toThrow(/didn't load/)
  })

  it('explains when streams are unavailable', () => {
    renderView({ view: {} as DevboxWorkspaceApi })
    expect(screen.getByText('Browser unavailable')).toBeTruthy()
    expect(openStream).not.toHaveBeenCalled()
  })
})
