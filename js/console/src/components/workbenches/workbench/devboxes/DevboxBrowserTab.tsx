import type RFB from '@novnc/novnc/lib/rfb'
import {
  Button,
  CaretLeftIcon,
  Chip,
  CloseIcon,
  ExpandIcon,
  Flex,
  IconFrame,
  Input,
  ReloadIcon,
  Switch,
} from '@pluralsh/design-system'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { CaptionP } from 'components/utils/typography/Text'
import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { DevboxUnavailable } from './DevboxUnavailable'
import {
  devboxBrowserUrl,
  devboxStreamSocketUrl,
  DevboxWorkspaceApi,
  ticketSubprotocols,
} from './devboxWorkspaceApi'

type VncState = 'connecting' | 'connected' | 'disconnected'
type RfbClient = RFB & { focus?: (options?: FocusOptions) => void }

export function DevboxBrowserView({
  api,
  live,
  browserEnabled,
  onClose,
}: {
  api: DevboxWorkspaceApi
  live: boolean
  browserEnabled: boolean
  onClose: () => void
}) {
  return (
    <ViewSC>
      {!api.openStream ? (
        <>
          <BackButton onClose={onClose} />
          <DevboxUnavailable
            title="Browser unavailable"
            message="Console doesn't serve devbox streams yet (openDevboxStream)."
          />
        </>
      ) : !live ? (
        <>
          <BackButton onClose={onClose} />
          <DevboxUnavailable
            title="Instance isn't running"
            message="Resume the instance to view its browser."
          />
        </>
      ) : browserEnabled ? (
        <DevboxVnc
          openStream={api.openStream}
          onClose={onClose}
        />
      ) : (
        <>
          <BackButton onClose={onClose} />
          <CaptionP $color="text-xlight">
            This box doesn't run a browser. Enable it in the box's spec to watch
            the agent browse.
          </CaptionP>
        </>
      )}
    </ViewSC>
  )
}

function BackButton({ onClose }: { onClose: () => void }) {
  return (
    <Button
      small
      secondary
      startIcon={<CaretLeftIcon />}
      onClick={onClose}
    >
      Back to session
    </Button>
  )
}

async function connectVnc(
  target: HTMLElement,
  openStream: NonNullable<DevboxWorkspaceApi['openStream']>,
  onState: (state: VncState) => void
): Promise<RfbClient> {
  const [{ default: RFBClient }, ticket] = await Promise.all([
    import('@novnc/novnc/lib/rfb'),
    openStream({ kind: 'vnc' }),
  ])
  const protocols = ticketSubprotocols(ticket)
  const rfb = new RFBClient(target, devboxStreamSocketUrl(ticket), {
    wsProtocols: protocols.length ? protocols : ['binary'],
  }) as RfbClient
  // the session is 1280x800; scale it into the column and the full screen
  rfb.scaleViewport = true
  rfb.resizeSession = false
  rfb.viewOnly = false
  rfb.addEventListener('connect', () => onState('connected'))
  rfb.addEventListener('disconnect', () => onState('disconnected'))
  return rfb
}

function DevboxVnc({
  openStream,
  onClose,
}: {
  openStream: NonNullable<DevboxWorkspaceApi['openStream']>
  onClose: () => void
}) {
  const targetRef = useRef<HTMLDivElement>(null)
  const rfbRef = useRef<Nullable<RfbClient>>(null)
  const [state, setState] = useState<VncState>('connecting')
  const [control, setControl] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let disposed = false
    const target = targetRef.current
    if (target)
      connectVnc(target, openStream, (s) => {
        if (!disposed) setState(s)
      })
        .then((rfb) => {
          if (disposed) rfb.disconnect()
          else rfbRef.current = rfb
        })
        .catch(() => {
          if (!disposed) setState('disconnected')
        })
    return () => {
      disposed = true
      rfbRef.current?.disconnect()
      rfbRef.current = null
    }
  }, [openStream, attempt])

  useEffect(() => {
    if (rfbRef.current) rfbRef.current.viewOnly = !control
  }, [control, state])

  useEffect(() => {
    const onChange = () =>
      setFullscreen(document.fullscreenElement === targetRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = () => {
    const target = targetRef.current
    if (!target) return
    if (document.fullscreenElement === target) {
      document.exitFullscreen?.()
      return
    }
    void target.requestFullscreen?.()?.then(() => rfbRef.current?.focus?.())
  }

  return (
    <Flex
      direction="column"
      gap="small"
      flex={1}
      height="100%"
      minHeight={0}
    >
      <Flex
        justify="space-between"
        align="center"
        gap="small"
      >
        <Flex
          gap="small"
          align="center"
        >
          <BackButton onClose={onClose} />
          <Chip
            size="small"
            severity={state === 'connected' ? 'success' : 'warning'}
          >
            {state}
          </Chip>
          <Switch
            checked={control}
            onChange={setControl}
          >
            Take control
          </Switch>
        </Flex>
        <Flex
          gap="small"
          align="center"
        >
          <DevboxOpenInBrowser openStream={openStream} />
          {state === 'disconnected' && (
            <Button
              small
              tertiary
              startIcon={<ReloadIcon />}
              onClick={() => {
                setState('connecting')
                setAttempt((a) => a + 1)
              }}
            >
              Reconnect
            </Button>
          )}
          <IconFrame
            clickable
            textValue={fullscreen ? 'Exit fullscreen' : 'View fullscreen'}
            icon={fullscreen ? <CloseIcon /> : <ExpandIcon />}
            tooltip={fullscreen ? 'Exit fullscreen' : 'View fullscreen'}
            onClick={toggleFullscreen}
          />
        </Flex>
      </Flex>
      <VncSC ref={targetRef} />
    </Flex>
  )
}

function DevboxOpenInBrowser({
  openStream,
}: {
  openStream: NonNullable<DevboxWorkspaceApi['openStream']>
}) {
  const { popToast } = useSimpleToast()
  const [target, setTarget] = useState('3000')
  const [opening, setOpening] = useState(false)
  const url = devboxBrowserUrl(target)

  const open = () => {
    if (!url) return
    setOpening(true)
    openStream({ kind: 'vnc', url })
      .catch((e) =>
        popToast({ content: (e as Error).message, severity: 'danger' })
      )
      .then(() => setOpening(false))
  }

  return (
    <Flex
      gap="small"
      align="center"
    >
      <Input
        aria-label="Port or URL to open in the browser"
        placeholder="3000 or localhost:3000/path"
        value={target}
        width={260}
        onChange={(e) => setTarget(e.currentTarget.value)}
        onEnter={open}
      />
      <Button
        small
        secondary
        disabled={!url}
        loading={opening}
        onClick={open}
      >
        Open in browser
      </Button>
    </Flex>
  )
}

const ViewSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  padding: theme.spacing.medium,
}))

const VncSC = styled.div(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.default,
  backgroundColor: theme.colors['fill-zero'],
  '&:fullscreen': {
    width: '100%',
    height: '100%',
    border: 'none',
    borderRadius: 0,
  },
}))
