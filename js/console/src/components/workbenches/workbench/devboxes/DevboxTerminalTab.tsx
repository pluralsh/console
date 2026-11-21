import '@xterm/xterm/css/xterm.css'

import { Chip, IconFrame, ReloadIcon } from '@pluralsh/design-system'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import TerminalThemeContext from 'components/terminal/TerminalThemeContext'
import { normalizedThemes } from 'components/terminal/themes'
import { debounce } from 'lodash'
import { use, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { DevboxUnavailable } from './DevboxUnavailable'
import {
  devboxStreamSocketUrl,
  DevboxWorkspaceApi,
  ticketSubprotocols,
} from './devboxWorkspaceApi'

type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'exited'
  | 'error'

const MAX_BACKOFF_MS = 15_000

// headerActions is the panel header slot the connection status renders into
export function DevboxTerminalTab({
  api,
  live,
  headerActions,
}: {
  api: DevboxWorkspaceApi
  live: boolean
  headerActions: Nullable<HTMLElement>
}) {
  if (!api.openStream)
    return (
      <DevboxUnavailable
        title="Terminal unavailable"
        message="Console doesn't serve devbox streams yet (openDevboxStream)."
      />
    )
  if (!live)
    return (
      <DevboxUnavailable
        title="Instance isn't running"
        message="Resume the instance to open a terminal."
      />
    )
  return (
    <DevboxTerminal
      openStream={api.openStream}
      headerActions={headerActions}
    />
  )
}

function DevboxTerminal({
  openStream,
  headerActions,
}: {
  openStream: NonNullable<DevboxWorkspaceApi['openStream']>
  headerActions: Nullable<HTMLElement>
}) {
  const [terminalTheme] = use(TerminalThemeContext)
  const elRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<ConnectionState>('connecting')
  const [exit, setExit] = useState<Nullable<string>>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!elRef.current) return
    return startDevboxTerminal(elRef.current, {
      openStream,
      theme: terminalTheme,
      onState: setState,
      onExit: setExit,
    })
    // attempt forces a fresh connection after a manual reconnect
  }, [openStream, terminalTheme, attempt])

  return (
    <>
      {headerActions &&
        createPortal(
          <>
            <Chip
              size="small"
              severity={
                state === 'connected'
                  ? 'success'
                  : state === 'exited' || state === 'error'
                    ? 'neutral'
                    : 'warning'
              }
            >
              {state === 'exited' ? `Exited · ${exit}` : state}
            </Chip>
            {state !== 'connected' && (
              <IconFrame
                clickable
                size="small"
                icon={<ReloadIcon />}
                tooltip="Reconnect"
                onClick={() => setAttempt((a) => a + 1)}
              />
            )}
          </>,
          headerActions
        )}
      <TerminalSC $background={normalizedThemes[terminalTheme].background}>
        <div
          ref={elRef}
          className="terminal"
        />
      </TerminalSC>
    </>
  )
}

// returns a disposer that closes the socket and tears down xterm
function startDevboxTerminal(
  el: HTMLElement,
  {
    openStream,
    theme,
    onState,
    onExit,
  }: {
    openStream: NonNullable<DevboxWorkspaceApi['openStream']>
    theme: string
    onState: (state: ConnectionState) => void
    onExit: (exit: string) => void
  }
) {
  const xterm = new Terminal({
    cursorBlink: true,
    theme: normalizedThemes[theme],
  })
  const fit = new FitAddon()
  xterm.loadAddon(fit)
  xterm.open(el)
  fit.fit()

  const encoder = new TextEncoder()
  let ws: Nullable<WebSocket> = null
  let terminalId: Nullable<string> = null
  let offset = 0
  let backoff = 1000
  let disposed = false
  let exited = false
  let retry: ReturnType<typeof setTimeout> | undefined

  const sendResize = () => {
    if (ws?.readyState !== WebSocket.OPEN) return
    ws.send(
      JSON.stringify({ type: 'resize', cols: xterm.cols, rows: xterm.rows })
    )
  }

  const scheduleReconnect = () => {
    onState('reconnecting')
    retry = setTimeout(() => connect(true), backoff)
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
  }

  const connect = async (reconnect: boolean) => {
    onState(reconnect ? 'reconnecting' : 'connecting')
    try {
      const ticket = await openStream({ kind: 'terminal', terminalId })
      if (disposed) return
      terminalId = ticket.terminalId ?? terminalId
      const socket = new WebSocket(
        devboxStreamSocketUrl(ticket, {
          offset: reconnect ? offset : undefined,
        }),
        ticketSubprotocols(ticket)
      )
      socket.binaryType = 'arraybuffer'
      ws = socket
      socket.onopen = () => {
        backoff = 1000
        onState('connected')
        fit.fit()
        sendResize()
      }
      socket.onmessage = (event) => {
        if (typeof event.data === 'string') {
          const frame = parseFrame(event.data)
          if (frame?.type === 'output' && typeof frame.offset === 'number')
            offset = frame.offset
          else if (
            frame?.type === 'info' &&
            typeof frame.terminalId === 'string'
          )
            terminalId = frame.terminalId
          else if (frame?.type === 'exit') {
            exited = true
            onExit(
              frame.signal
                ? `signal ${frame.signal}`
                : `exit ${frame.exitCode ?? 0}`
            )
            onState('exited')
          }
          return
        }
        const bytes = new Uint8Array(event.data as ArrayBuffer)
        offset += bytes.byteLength
        xterm.write(bytes)
      }
      socket.onclose = () => {
        if (disposed || exited) return
        scheduleReconnect()
      }
    } catch {
      if (!disposed) scheduleReconnect()
    }
  }

  const input = xterm.onData((data) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(encoder.encode(data))
  })
  const resize = xterm.onResize(() => sendResize())

  const observer = new ResizeObserver(debounce(() => fit.fit(), 150))
  observer.observe(el)

  connect(false)

  return () => {
    disposed = true
    clearTimeout(retry)
    observer.disconnect()
    input.dispose()
    resize.dispose()
    ws?.close()
    xterm.dispose()
  }
}

function parseFrame(data: string): Nullable<Record<string, any>> {
  try {
    const frame = JSON.parse(data)
    return frame && typeof frame === 'object' ? frame : null
  } catch {
    return null
  }
}

const TerminalSC = styled.div<{ $background: string }>(
  ({ theme, $background }) => ({
    flex: 1,
    minHeight: 320,
    overflow: 'hidden',
    padding: theme.spacing.small,
    borderRadius: theme.borderRadiuses.large,
    border: theme.borders.default,
    backgroundColor: $background,
    '.terminal': { height: '100%', width: '100%' },
  })
)
