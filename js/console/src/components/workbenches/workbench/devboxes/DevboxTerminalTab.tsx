import '@xterm/xterm/css/xterm.css'

import {
  Chip,
  CliIcon,
  CloseIcon,
  IconFrame,
  PlusIcon,
  ReloadIcon,
} from '@pluralsh/design-system'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import usePersistedSessionState from 'components/hooks/usePersistedSessionState'
import TerminalThemeContext from 'components/terminal/TerminalThemeContext'
import { normalizedThemes } from 'components/terminal/themes'
import { loadWebglRenderer } from 'components/terminal/webgl'
import { debounce } from 'lodash'
import { use, useEffect, useLayoutEffect, useRef, useState } from 'react'
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

// like VS Code's terminal tabs: the running process and its directory
export type TerminalTitle = { name: string; dir: string; cwd: string }

type TerminalSession = {
  key: string
  label: string
  // the daemon's terminal, reattached on remount so its shell isn't orphaned
  terminalId?: Nullable<string>
  title?: Nullable<TerminalTitle>
}

type TerminalSessions = {
  sessions: TerminalSession[]
  active: string
  next: number
}

const MAX_SESSIONS = 8

const newSession = (n: number): TerminalSession => ({
  key: `${n}`,
  label: `Terminal ${n}`,
})

const INITIAL_SESSIONS: TerminalSessions = {
  sessions: [newSession(1)],
  active: '1',
  next: 2,
}

type TerminalControl = { close: () => void }

const commandName = (command: Nullable<string>) =>
  command?.trim().split(/\s+/)[0]?.split('/').pop() || ''

// the foreground job when one is running, else the shell, in the shell's cwd
export function terminalTitle(
  info: Record<string, unknown>
): Nullable<TerminalTitle> {
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const name =
    commandName(str(info.foregroundCommand)) || commandName(str(info.command))
  const cwd = str(info.cwd)
  if (!name) return null
  return { name, dir: cwd.replace(/\/+$/, '').split('/').pop() || cwd, cwd }
}

// headerActions is the panel header slot the connection status renders into
export function DevboxTerminalTab({
  instanceId,
  api,
  live,
  headerActions,
}: {
  instanceId: string
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
    <DevboxTerminalSessions
      instanceId={instanceId}
      openStream={api.openStream}
      headerActions={headerActions}
    />
  )
}

function DevboxTerminalSessions({
  instanceId,
  openStream,
  headerActions,
}: {
  instanceId: string
  openStream: NonNullable<DevboxWorkspaceApi['openStream']>
  headerActions: Nullable<HTMLElement>
}) {
  const [{ sessions, active }, setSessions] =
    usePersistedSessionState<TerminalSessions>(
      `devbox-terminals-${instanceId}`,
      INITIAL_SESSIONS
    )
  const controls = useRef(new Map<string, TerminalControl>())

  const add = () =>
    setSessions((s) =>
      s.sessions.length >= MAX_SESSIONS
        ? s
        : {
            sessions: [...s.sessions, newSession(s.next)],
            active: `${s.next}`,
            next: s.next + 1,
          }
    )
  const close = (key: string) => {
    controls.current.get(key)?.close()
    setSessions((s) => {
      const index = s.sessions.findIndex((t) => t.key === key)
      const rest = s.sessions.filter((t) => t.key !== key)
      if (rest.length === 0)
        return {
          sessions: [newSession(s.next)],
          active: `${s.next}`,
          next: s.next + 1,
        }
      return {
        ...s,
        sessions: rest,
        active:
          s.active === key
            ? rest[Math.min(index, rest.length - 1)].key
            : s.active,
      }
    })
  }
  const update = (key: string, patch: Partial<TerminalSession>) =>
    setSessions((s) => ({
      ...s,
      sessions: s.sessions.map((t) => (t.key === key ? { ...t, ...patch } : t)),
    }))
  const activeKey = sessions.some((t) => t.key === active)
    ? active
    : sessions[0]?.key

  return (
    <SessionsSC>
      <SessionStripSC role="tablist">
        {sessions.map((t) => (
          <SessionTabSC
            key={t.key}
            $selected={t.key === activeKey}
          >
            <button
              type="button"
              role="tab"
              aria-selected={t.key === activeKey}
              className="label"
              title={t.title?.cwd}
              onClick={() => setSessions((s) => ({ ...s, active: t.key }))}
            >
              <CliIcon size={12} />
              {t.title ? (
                <>
                  <span>{t.title.name}</span>
                  <span className="dir">{t.title.dir}</span>
                </>
              ) : (
                t.label
              )}
            </button>
            <IconFrame
              clickable
              size="xsmall"
              icon={<CloseIcon />}
              tooltip="Close terminal"
              aria-label={`Close ${t.label}`}
              onClick={() => close(t.key)}
            />
          </SessionTabSC>
        ))}
        <IconFrame
          clickable
          size="small"
          icon={<PlusIcon />}
          tooltip={
            sessions.length >= MAX_SESSIONS
              ? `At most ${MAX_SESSIONS} terminals`
              : 'New terminal'
          }
          aria-label="New terminal"
          disabled={sessions.length >= MAX_SESSIONS}
          onClick={add}
        />
      </SessionStripSC>
      {sessions.map((t) => (
        <DevboxTerminal
          key={t.key}
          active={t.key === activeKey}
          terminalId={t.terminalId}
          openStream={openStream}
          headerActions={headerActions}
          onTerminalId={(id) => update(t.key, { terminalId: id })}
          onTitle={(title) => update(t.key, { title })}
          onControl={(control) => {
            if (control) controls.current.set(t.key, control)
            else controls.current.delete(t.key)
          }}
        />
      ))}
    </SessionsSC>
  )
}

function DevboxTerminal({
  active,
  terminalId,
  openStream,
  headerActions,
  onTerminalId,
  onTitle,
  onControl,
}: {
  active: boolean
  terminalId: Nullable<string>
  openStream: NonNullable<DevboxWorkspaceApi['openStream']>
  headerActions: Nullable<HTMLElement>
  onTerminalId: (terminalId: Nullable<string>) => void
  onTitle: (title: TerminalTitle) => void
  onControl: (control: Nullable<TerminalControl>) => void
}) {
  const [terminalTheme] = use(TerminalThemeContext)
  const elRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<ConnectionState>('connecting')
  const [exit, setExit] = useState<Nullable<string>>(null)
  const [attempt, setAttempt] = useState(0)
  // read when (re)connecting, so learning the id doesn't restart the stream
  const terminalIdRef = useRef(terminalId)
  const callbacks = useRef({ onTerminalId, onTitle, onControl })
  useLayoutEffect(() => {
    callbacks.current = { onTerminalId, onTitle, onControl }
  })

  useEffect(() => {
    if (!elRef.current) return
    const { dispose, close } = startDevboxTerminal(elRef.current, {
      openStream,
      terminalId: terminalIdRef.current,
      theme: terminalTheme,
      onState: setState,
      onExit: setExit,
      onTerminalId: (id) => {
        if (id === terminalIdRef.current) return
        terminalIdRef.current = id
        callbacks.current.onTerminalId(id)
      },
      onTitle: (title) => callbacks.current.onTitle(title),
    })
    callbacks.current.onControl({ close })
    return () => {
      callbacks.current.onControl(null)
      dispose()
    }
    // attempt forces a fresh connection after a manual reconnect
  }, [openStream, terminalTheme, attempt])

  const reconnect = () => {
    // an exited shell can't be reattached, so start a new one in its place
    if (state === 'exited') {
      terminalIdRef.current = null
      onTerminalId(null)
    }
    setExit(null)
    setAttempt((a) => a + 1)
  }

  return (
    <>
      {active &&
        headerActions &&
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
                tooltip={state === 'exited' ? 'Restart' : 'Reconnect'}
                onClick={reconnect}
              />
            )}
          </>,
          headerActions
        )}
      <TerminalSC
        $active={active}
        $background={normalizedThemes[terminalTheme].background}
      >
        <div
          ref={elRef}
          className="terminal"
        />
      </TerminalSC>
    </>
  )
}

// `dispose` detaches, closing the socket and tearing down xterm, while `close`
// also ends the shell on the devbox
function startDevboxTerminal(
  el: HTMLElement,
  {
    openStream,
    terminalId: initialTerminalId,
    theme,
    onState,
    onExit,
    onTerminalId,
    onTitle,
  }: {
    openStream: NonNullable<DevboxWorkspaceApi['openStream']>
    terminalId: Nullable<string>
    theme: string
    onState: (state: ConnectionState) => void
    onExit: (exit: string) => void
    onTerminalId: (terminalId: string) => void
    onTitle: (title: TerminalTitle) => void
  }
) {
  const xterm = new Terminal({
    cursorBlink: true,
    theme: normalizedThemes[theme],
  })
  const fit = new FitAddon()
  xterm.loadAddon(fit)
  xterm.open(el)
  loadWebglRenderer(xterm)
  fit.fit()

  const encoder = new TextEncoder()
  let ws: Nullable<WebSocket> = null
  let terminalId: Nullable<string> = initialTerminalId
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
      if (terminalId) onTerminalId(terminalId)
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
          else if (frame?.type === 'info') {
            if (typeof frame.terminalId === 'string') {
              terminalId = frame.terminalId
              onTerminalId(frame.terminalId)
            }
            const title = terminalTitle(frame)
            if (title) onTitle(title)
          } else if (frame?.type === 'exit') {
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

  return {
    dispose: () => {
      disposed = true
      clearTimeout(retry)
      observer.disconnect()
      input.dispose()
      resize.dispose()
      ws?.close()
      xterm.dispose()
    },
    close: () => {
      if (ws?.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: 'close' }))
    },
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

const SessionsSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
})

const SessionStripSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
  flexShrink: 0,
  overflowX: 'auto',
  padding: `${theme.spacing.xxsmall} ${theme.spacing.xsmall}`,
  borderBottom: theme.borders.default,
}))

// mirrors the panel's tabs: the selected session carries a fill
const SessionTabSC = styled.div<{ $selected: boolean }>(
  ({ theme, $selected }) => {
    const selectedFill =
      theme.mode === 'light'
        ? theme.colors.grey[50]
        : theme.colors['fill-one-selected']
    return {
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0,
      height: 24,
      paddingRight: theme.spacing.xxsmall,
      borderRadius: theme.borderRadiuses.medium,
      backgroundColor: $selected ? selectedFill : 'transparent',
      '&:hover': {
        backgroundColor: $selected
          ? selectedFill
          : theme.colors['fill-zero-hover'],
      },
      '.label': {
        ...theme.partials.reset.button,
        ...theme.partials.text.caption,
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.xxsmall,
        alignSelf: 'stretch',
        padding: `0 ${theme.spacing.xsmall}`,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        color: $selected ? theme.colors.text : theme.colors['text-light'],
        '&:focus-visible': { outline: theme.borders['outline-focused'] },
      },
      '.dir': { color: theme.colors['text-xlight'] },
    }
  }
)

// hidden sessions stay mounted so their shells keep streaming
const TerminalSC = styled.div<{ $active: boolean; $background: string }>(
  ({ theme, $active, $background }) => ({
    display: $active ? 'block' : 'none',
    flex: 1,
    minHeight: 320,
    overflow: 'hidden',
    padding: theme.spacing.xsmall,
    backgroundColor: $background,
    '.terminal': { height: '100%', width: '100%' },
  })
)
