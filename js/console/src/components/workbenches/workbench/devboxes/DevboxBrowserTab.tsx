import type RFB from '@novnc/novnc/lib/rfb'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Button,
  ExpandIcon,
  IconFrame,
  ReloadIcon,
  ShrinkIcon,
  Spinner,
} from '@pluralsh/design-system'
import { SelectElementIcon } from 'components/utils/icons/SelectElementIcon'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { CaptionP } from 'components/utils/typography/Text'
import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { DevboxUnavailable } from './DevboxUnavailable'
import {
  devboxStreamSocketUrl,
  DevboxWorkspaceApi,
  ticketSubprotocols,
} from './devboxWorkspaceApi'
import {
  connectVoxl,
  VOXL_SUBPROTOCOL,
  VoxlPickedElement,
  VoxlPickResult,
} from './voxlClient'

type VncState =
  | { kind: 'connecting' }
  // pick: the stream can pick elements in the page (voxl boxes)
  | { kind: 'connected'; pick?: boolean }
  | { kind: 'disconnected'; error?: string }
type RfbClient = RFB & { focus?: (options?: FocusOptions) => void }
type BrowserClient = {
  disconnect: () => void
  focus: () => void
  pick?: (on: boolean) => void
}

export type DevboxBrowserPlacement = 'panel' | 'main'

// the box's browser lives in the side panel, and can move to the main view and back
export function DevboxBrowserView({
  api,
  live,
  placement,
  onMove,
  onPick,
}: {
  api: DevboxWorkspaceApi
  live: boolean
  placement: DevboxBrowserPlacement
  onMove: () => void
  // an element picked in the page, for the prompt
  onPick?: (element: VoxlPickedElement) => void
}) {
  return (
    <ViewSC $placement={placement}>
      {!api.openStream ? (
        <DevboxUnavailable
          title="Browser unavailable"
          message="Console doesn't serve devbox streams yet (openDevboxStream)."
        />
      ) : !live ? (
        <DevboxUnavailable
          title="Instance isn't running"
          message="Resume the instance to view its browser."
        />
      ) : (
        <DevboxVnc
          openStream={api.openStream}
          placement={placement}
          onMove={onMove}
          onPick={onPick}
        />
      )}
    </ViewSC>
  )
}

// boxes with voxl stream H.264 (their tickets carry its subprotocol); older
// images serve VNC for noVNC
async function connectBrowser(
  target: HTMLElement,
  openStream: NonNullable<DevboxWorkspaceApi['openStream']>,
  onState: (state: VncState) => void,
  onPick: (result: VoxlPickResult) => void
): Promise<BrowserClient> {
  const ticket = await openStream({ kind: 'vnc' })
  const protocols = ticketSubprotocols(ticket)
  if (protocols.includes(VOXL_SUBPROTOCOL))
    return connectVoxl(target, devboxStreamSocketUrl(ticket), protocols, {
      onConnect: ({ pick }) => onState({ kind: 'connected', pick }),
      onDisconnect: () => onState({ kind: 'disconnected' }),
      onPick,
    })
  // lib/rfb is CommonJS, and the production build hands its whole exports
  // object back as the default
  const RFBClient = rfbConstructor(await import('@novnc/novnc/lib/rfb'))
  const rfb = new RFBClient(target, devboxStreamSocketUrl(ticket), {
    wsProtocols: protocols.length ? protocols : ['binary'],
  }) as RfbClient
  // the session is 1280x800; scale it into the view and the full screen
  rfb.scaleViewport = true
  rfb.resizeSession = false
  rfb.viewOnly = false
  rfb.addEventListener('connect', () => onState({ kind: 'connected' }))
  rfb.addEventListener('disconnect', () => onState({ kind: 'disconnected' }))
  return {
    disconnect: () => rfb.disconnect(),
    focus: () => rfb.focus?.(),
  }
}

type RfbConstructor = typeof import('@novnc/novnc/lib/rfb').default

export function rfbConstructor(mod: unknown): RfbConstructor {
  let m = mod as { default?: unknown }
  while (typeof m !== 'function' && m?.default) m = m.default as typeof m
  if (typeof m !== 'function')
    throw new Error("the browser client (noVNC) didn't load")
  return m as unknown as RfbConstructor
}

function DevboxVnc({
  openStream,
  placement,
  onMove,
  onPick,
}: {
  openStream: NonNullable<DevboxWorkspaceApi['openStream']>
  placement: DevboxBrowserPlacement
  onMove: () => void
  onPick?: (element: VoxlPickedElement) => void
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)
  const clientRef = useRef<Nullable<BrowserClient>>(null)
  const [state, setState] = useState<VncState>({ kind: 'connecting' })
  const [fullscreen, setFullscreen] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [picking, setPicking] = useState(false)
  const { popToast } = useSimpleToast()
  const picked = useRef({ onPick, popToast })
  useEffect(() => {
    picked.current = { onPick, popToast }
  })

  useEffect(() => {
    let disposed = false
    const target = targetRef.current
    if (target)
      connectBrowser(
        target,
        openStream,
        (s) => {
          if (disposed) return
          setState(s)
          if (s.kind !== 'connected') setPicking(false)
        },
        (result) => {
          if (disposed) return
          setPicking(false)
          if ('element' in result) picked.current.onPick?.(result.element)
          else if ('error' in result)
            picked.current.popToast({
              content: `Couldn't pick the element: ${result.error}`,
              severity: 'danger',
            })
        }
      )
        .then((client) => {
          if (disposed) client.disconnect()
          else clientRef.current = client
        })
        .catch((e) => {
          if (!disposed)
            setState({ kind: 'disconnected', error: (e as Error).message })
        })
    return () => {
      disposed = true
      clientRef.current?.disconnect()
      clientRef.current = null
    }
  }, [openStream, attempt])

  useEffect(() => {
    const onChange = () =>
      setFullscreen(document.fullscreenElement === frameRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = () => {
    const frame = frameRef.current
    if (!frame) return
    if (document.fullscreenElement === frame) {
      document.exitFullscreen?.()
      return
    }
    void frame.requestFullscreen?.()?.then(() => clientRef.current?.focus())
  }
  const fullscreenLabel = fullscreen ? 'Exit fullscreen' : 'View fullscreen'
  const canPick =
    !!onPick && state.kind === 'connected' && !!state.pick && !fullscreen
  const togglePicking = () => {
    const client = clientRef.current
    if (!client?.pick) return
    client.pick(!picking)
    setPicking(!picking)
    client.focus()
  }

  return (
    <>
      <ToolbarSC>
        {canPick && (
          <IconFrame
            clickable
            selected={picking}
            textValue={picking ? 'Stop selecting' : 'Select an element'}
            icon={<SelectElementIcon />}
            tooltip={
              picking
                ? 'Stop selecting (Esc)'
                : 'Select an element to add to your prompt'
            }
            onClick={togglePicking}
          />
        )}
        {placement === 'main' ? (
          <Button
            small
            secondary
            startIcon={<ArrowRightIcon />}
            onClick={onMove}
          >
            Move to sidebar
          </Button>
        ) : (
          <IconFrame
            clickable
            textValue="Open in main view"
            icon={<ArrowLeftIcon />}
            tooltip="Open in main view"
            onClick={onMove}
          />
        )}
        <IconFrame
          clickable
          disabled={state.kind !== 'connected'}
          textValue={fullscreenLabel}
          icon={fullscreen ? <ShrinkIcon /> : <ExpandIcon />}
          tooltip={fullscreenLabel}
          onClick={toggleFullscreen}
        />
      </ToolbarSC>
      <FrameSC
        ref={frameRef}
        $placement={placement}
      >
        <VncSC ref={targetRef} />
        {picking && (
          <PickHintSC>
            <CaptionP $color="text">
              Click an element to add it to your prompt · Esc to cancel
            </CaptionP>
          </PickHintSC>
        )}
        {fullscreen && (
          <FullscreenActionsSC>
            <IconFrame
              clickable
              type="floating"
              textValue="Exit fullscreen"
              icon={<ShrinkIcon />}
              tooltip="Exit fullscreen"
              onClick={toggleFullscreen}
            />
          </FullscreenActionsSC>
        )}
        {state.kind !== 'connected' && (
          <OverlaySC>
            {state.kind === 'connecting' ? (
              <>
                <Spinner size={16} />
                <CaptionP $color="text-light">
                  Starting the box's browser…
                </CaptionP>
              </>
            ) : (
              <>
                <CaptionP $color="text-light">
                  {state.error
                    ? `Couldn't reach the box's browser: ${state.error}`
                    : 'The browser disconnected.'}
                </CaptionP>
                <Button
                  small
                  secondary
                  startIcon={<ReloadIcon />}
                  onClick={() => {
                    setState({ kind: 'connecting' })
                    setAttempt((a) => a + 1)
                  }}
                >
                  Reconnect
                </Button>
              </>
            )}
          </OverlaySC>
        )}
      </FrameSC>
    </>
  )
}

const ViewSC = styled.div<{ $placement: DevboxBrowserPlacement }>(
  ({ theme, $placement }) => ({
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    gap: theme.spacing.small,
    padding: $placement === 'main' ? theme.spacing.medium : theme.spacing.small,
  })
)

const ToolbarSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: theme.spacing.xsmall,
  flexShrink: 0,
}))

const FrameSC = styled.div<{ $placement: DevboxBrowserPlacement }>(
  ({ theme, $placement }) => ({
    position: 'relative',
    display: 'flex',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    borderRadius:
      $placement === 'main'
        ? theme.borderRadiuses.large
        : theme.borderRadiuses.medium,
    border: theme.borders.default,
    backgroundColor: theme.colors['fill-zero'],
    '&:fullscreen': {
      border: 'none',
      borderRadius: 0,
    },
  })
)

const VncSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
})

// sits above the page without taking the pointer, which the page needs to pick
const PickHintSC = styled.div(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing.small,
  left: '50%',
  transform: 'translateX(-50%)',
  padding: `${theme.spacing.xxsmall} ${theme.spacing.small}`,
  borderRadius: theme.borderRadiuses.medium,
  border: theme.borders['outline-focused'],
  backgroundColor: theme.colors['fill-one'],
  boxShadow: theme.boxShadows.moderate,
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
}))

const FullscreenActionsSC = styled.div(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing.small,
  right: theme.spacing.small,
}))

const OverlaySC = styled.div(({ theme }) => ({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing.small,
  padding: theme.spacing.large,
  textAlign: 'center',
}))
