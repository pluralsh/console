import { Button, Callout, Flex, ReloadIcon } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import {
  Delta,
  DevboxInstanceStatus,
  useDevboxInstanceQuery,
  useDevboxInstanceStatusDeltaSubscription,
  useDevboxPullRequestsQuery,
  useDevboxThreadDeltaSubscription,
  useResumeDevboxInstanceMutation,
  useWorkbenchDevboxesQuery,
} from 'generated/graphql'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import {
  WORKBENCH_DEVBOX_POSITION_QUERY_PARAM,
  WORKBENCH_DEVBOX_TAB_QUERY_PARAM,
  WORKBENCH_DEVBOX_THREAD_QUERY_PARAM,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchEmptyState } from '../../common/WorkbenchEmptyState'
import {
  DevboxControlPanel,
  isPanelTab,
  useDevboxPanelOpen,
} from './DevboxControlPanel'
import { isClusterOfflineError } from './devboxErrors'
import {
  effectiveMaxDeferral,
  getDevboxAwakeStatus,
  isInstanceLive,
} from './devboxIdle'
import { DevboxInstanceHeader } from './DevboxInstanceHeader'
import { DevboxNewSession } from './DevboxNewSession'
import { DevboxThreadPane } from './DevboxThreadPane'
import { ImportThreadModal } from './DevboxThreadList'
import { selectedThread } from './devboxThreads'
import { useDevboxWorkspaceApi } from './devboxWorkspaceApi'
import { useDevboxPresence } from './useDevboxPresence'
import { useDevboxTimelineStore } from './useDevboxTimeline'

export function DevboxInstanceView({ instanceId }: { instanceId: string }) {
  const [params, setParams] = useSearchParams()
  const { popToast } = useSimpleToast()
  const tabParam = params.get(WORKBENCH_DEVBOX_TAB_QUERY_PARAM)
  const threadParam = params.get(WORKBENCH_DEVBOX_THREAD_QUERY_PARAM)
  const positionParam = params.get(WORKBENCH_DEVBOX_POSITION_QUERY_PARAM)
  const position = positionParam ? Number(positionParam) : null
  const [panelOpen, setPanelOpen] = useDevboxPanelOpen()
  const [importOpen, setImportOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const { slotRef, host } = useMovablePortal(fullscreen)

  useEffect(() => {
    if (!fullscreen) return
    const onKeyDown = (e: KeyboardEvent) => {
      // menus and dialogs claim Escape first
      if (e.key === 'Escape' && !e.defaultPrevented) setFullscreen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreen])

  const { data, loading, error, refetch } = useDevboxInstanceQuery({
    variables: { id: instanceId },
    skip: !instanceId,
    fetchPolicy: 'cache-and-network',
  })
  const instance = data?.devboxInstance
  const workbenchId = instance?.workbench?.id ?? ''

  const { data: workbenchData } = useWorkbenchDevboxesQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
  })
  const { data: prData } = useDevboxPullRequestsQuery({
    variables: { devboxInstanceId: instanceId },
    skip: !instanceId,
    fetchPolicy: 'cache-and-network',
  })
  const pullRequests = mapExistingNodes(prData?.pullRequests)

  const { error: statusError } = useDevboxInstanceStatusDeltaSubscription({
    variables: { id: instanceId },
    skip: !instanceId,
  })
  useDevboxThreadDeltaSubscription({
    variables: { instanceId },
    skip: !instanceId,
    onData: ({ data: { data } }) => {
      const delta = data?.devboxThreadDelta?.delta
      if (delta && delta !== Delta.Update) refetch()
    },
  })

  const timeline = useDevboxTimelineStore(instanceId)
  const api = useDevboxWorkspaceApi(instanceId)
  const live = isInstanceLive(instance?.status)
  useDevboxPresence(instanceId, live)

  // opening a suspended instance resumes it
  const [resume, resumeState] = useResumeDevboxInstanceMutation({
    onError: (e) => popToast({ content: e.message, severity: 'danger' }),
  })
  const autoResumed = useRef<string | null>(null)
  const suspended = instance?.status === DevboxInstanceStatus.Suspended
  useEffect(() => {
    if (!suspended || autoResumed.current === instanceId) return
    autoResumed.current = instanceId
    resume({ variables: { id: instanceId } })
  }, [instanceId, resume, suspended])
  const resuming = resumeState.loading || (!!resumeState.data && suspended)

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  const awake = instance
    ? getDevboxAwakeStatus(instance, { now, resuming })
    : null

  useSuspendingSoonToast(awake?.suspendingSoon ?? false, instance?.name)

  // surface live-only notices once
  const { dispatch: timelineDispatch } = timeline
  const notices = timeline.store.notices
  useEffect(() => {
    for (const notice of notices) {
      const message =
        (notice.payload.message as string) ??
        (notice.payload.text as string) ??
        'The agent sent a notice'
      popToast({ content: message, severity: 'info' })
      timelineDispatch({ type: 'dismissNotice', key: notice.key })
    }
  }, [notices, popToast, timelineDispatch])

  const setParam = (key: string, value: Nullable<string>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        if (key === WORKBENCH_DEVBOX_THREAD_QUERY_PARAM)
          next.delete(WORKBENCH_DEVBOX_POSITION_QUERY_PARAM)
        return next
      },
      { replace: true }
    )
  const selectThread = (id: string) =>
    setParam(WORKBENCH_DEVBOX_THREAD_QUERY_PARAM, id)

  if (!instance) {
    if (loading)
      return (
        <Flex
          padding="large"
          width="100%"
        >
          <RectangleSkeleton
            $height={480}
            $width="100%"
          />
        </Flex>
      )
    return error && !error.message.includes('could not find') ? (
      <GqlError
        header="Failed to load instance"
        margin="large"
        error={error}
      />
    ) : (
      <WorkbenchEmptyState
        message="Instance not found"
        description="It may have been deleted, or the link is out of date."
      />
    )
  }

  const selected = selectedThread(instance.threads, threadParam)
  const maxDeferral = effectiveMaxDeferral(
    instance.devbox?.idlePolicy?.maxDeferral,
    workbenchData?.workbench?.configuration?.devbox?.maxDeferral
  )
  const disconnected =
    !!statusError ||
    !!timeline.subscriptionError ||
    isClusterOfflineError(error)

  const view = (
    <ViewSC $fullscreen={fullscreen}>
      <MainSC>
        <HeaderBarSC>
          <DevboxInstanceHeader
            instance={instance}
            maxDeferralSeconds={maxDeferral}
            now={now}
            pullRequests={pullRequests}
            resuming={resuming}
            onResume={() => resume({ variables: { id: instance.id } })}
            onImportSession={() => setImportOpen(true)}
            fullscreen={fullscreen}
            onFullscreenChange={setFullscreen}
          />
        </HeaderBarSC>
        <BodySC>
          {disconnected && (
            <Callout
              severity="warning"
              title={
                isClusterOfflineError(error)
                  ? "The box's cluster is offline"
                  : 'Live updates disconnected'
              }
            >
              <Flex
                gap="small"
                align="center"
              >
                <span>
                  Showing the last known state. Reconnect to catch up on
                  anything missed.
                </span>
                <Button
                  small
                  secondary
                  startIcon={<ReloadIcon />}
                  onClick={() => {
                    refetch()
                    timeline.reload()
                  }}
                >
                  Reconnect
                </Button>
              </Flex>
            </Callout>
          )}
          {instance.statusReason &&
            instance.status === DevboxInstanceStatus.Failed && (
              <Callout
                severity="danger"
                title="Instance failed"
              >
                {instance.statusReason}
              </Callout>
            )}
          <ConversationSC>
            {selected ? (
              <DevboxThreadPane
                key={selected.id}
                instance={instance}
                thread={selected}
                timeline={timeline}
                position={selected.id === threadParam ? position : null}
              />
            ) : (
              <DevboxNewSession
                instance={instance}
                onStarted={selectThread}
              />
            )}
          </ConversationSC>
        </BodySC>
      </MainSC>
      <DevboxControlPanel
        instance={instance}
        api={api}
        live={live}
        tab={isPanelTab(tabParam) ? tabParam : 'files'}
        onTabChange={(tab) =>
          setParam(
            WORKBENCH_DEVBOX_TAB_QUERY_PARAM,
            tab === 'files' ? null : tab
          )
        }
        open={panelOpen}
        onOpenChange={setPanelOpen}
      />
      {importOpen && (
        <ImportThreadModal
          instance={instance}
          onClose={() => setImportOpen(false)}
          onImported={selectThread}
        />
      )}
    </ViewSC>
  )

  return (
    <>
      <SlotSC ref={slotRef} />
      {createPortal(view, host)}
    </>
  )
}

// renders into one node that moves between the layout and the body, so going
// fullscreen keeps terminals, streams and drafts mounted; the body escapes
// ancestors whose overflow or containment would trap position: fixed
function useMovablePortal(fullscreen: boolean) {
  const slotRef = useRef<HTMLDivElement>(null)
  const [host] = useState(() => {
    const node = document.createElement('div')
    node.style.display = 'contents'
    return node
  })

  useEffect(() => () => host.remove(), [host])

  // every render, as the slot only mounts once the instance has loaded
  useLayoutEffect(() => {
    const parent = fullscreen ? document.body : slotRef.current
    if (parent && host.parentNode !== parent) parent.appendChild(host)
  })

  return { slotRef, host }
}

function useSuspendingSoonToast(
  suspendingSoon: boolean,
  name: Nullable<string>
) {
  const { popToast } = useSimpleToast()
  const shown = useRef(false)
  useEffect(() => {
    if (!suspendingSoon) {
      shown.current = false
      return
    }
    if (shown.current) return
    shown.current = true
    const message = `${name || 'This instance'} is suspending soon. Keep it awake from the status menu.`
    popToast({ content: message, severity: 'danger' })
    if (
      document.visibilityState === 'hidden' &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    )
      new Notification('Devbox suspending soon', { body: message })
  }, [name, popToast, suspendingSoon])
}

const SlotSC = styled.div({
  display: 'flex',
  flex: 1,
  height: '100%',
  minHeight: 0,
  minWidth: 0,
  width: '100%',
})

const ViewSC = styled.div<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    display: 'flex',
    height: '100%',
    minHeight: 0,
    width: '100%',
    ...($fullscreen && {
      position: 'fixed',
      inset: 0,
      backgroundColor: theme.colors['fill-accent'],
      // below dialogs, so modals opened from within stay visible
      zIndex: theme.zIndexes.modal - 1,
    }),
  })
)

const MainSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
  minHeight: 0,
})

const HeaderBarSC = styled.div(({ theme }) => ({
  flexShrink: 0,
  padding: `${theme.spacing.small} ${theme.spacing.large}`,
  backgroundColor: theme.colors['fill-one'],
  borderBottom: theme.borders.default,
}))

const BodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  gap: theme.spacing.medium,
  padding: theme.spacing.large,
}))

const ConversationSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  width: '100%',
  maxWidth: 960,
  margin: '0 auto',
})
