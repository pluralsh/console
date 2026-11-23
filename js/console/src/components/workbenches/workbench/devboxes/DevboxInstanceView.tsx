import { Button, Callout, Flex, ReloadIcon } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import {
  Delta,
  DevboxInstanceStatus,
  useDevboxInstanceIndexDeltaSubscription,
  useDevboxInstanceQuery,
  useDevboxInstanceStatusDeltaSubscription,
  useDevboxThreadDeltaSubscription,
  useResumeDevboxInstanceMutation,
  useWorkbenchDevboxesQuery,
} from 'generated/graphql'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  WORKBENCH_DEVBOX_POSITION_QUERY_PARAM,
  WORKBENCH_DEVBOX_THREAD_QUERY_PARAM,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { WorkbenchEmptyState } from '../../common/WorkbenchEmptyState'
import { DevboxPanelRail, useDevboxPanel } from './DevboxControlPanel'
import { isClusterOfflineError } from './devboxErrors'
import { useDevboxPullRequests } from './devboxPullRequests'
import { mergePendingInteractions } from './devboxInteractions'
import { mergeNewThreads } from './devboxThreadsCache'
import { DevboxChangesViewer } from './DevboxChangesViewer'
import { DevboxFileViewer } from './DevboxFileViewer'
import {
  effectiveMaxDeferral,
  getDevboxAwakeStatus,
  isInstanceLive,
} from './devboxIdle'
import { DevboxInstanceHeader } from './DevboxInstanceHeader'
import { DevboxNewSession } from './DevboxNewSession'
import { DEVBOX_HEADER_HEIGHT } from './DevboxSessionsSidebar'
import { DevboxThreadPane } from './DevboxThreadPane'
import { ImportThreadModal } from './DevboxThreadList'
import { selectedThread } from './devboxThreads'
import { useSubscriptionRecovery } from 'components/hooks/useSubscriptionRecovery'
import { useDevboxPresence } from './useDevboxPresence'
import { DevboxTimelineStoreApi } from './useDevboxTimeline'
import { useDevboxWorkspaceApi } from './devboxWorkspaceApi'

export function DevboxInstanceView({
  instanceId,
  timeline,
}: {
  instanceId: string
  timeline: DevboxTimelineStoreApi
}) {
  const [params, setParams] = useSearchParams()
  const { popToast } = useSimpleToast()
  const threadParam = params.get(WORKBENCH_DEVBOX_THREAD_QUERY_PARAM)
  const positionParam = params.get(WORKBENCH_DEVBOX_POSITION_QUERY_PARAM)
  const position = positionParam ? Number(positionParam) : null
  const [importOpen, setImportOpen] = useState(false)

  const query = useDevboxInstanceQuery({
    variables: { id: instanceId },
    skip: !instanceId,
    fetchPolicy: 'cache-and-network',
  })
  const { data, loading, error, refetch } = query
  const instance = data?.devboxInstance
  const workbenchId = instance?.workbench?.id ?? ''

  const { data: workbenchData } = useWorkbenchDevboxesQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
  })
  const { refetch: refetchPullRequests } = useDevboxPullRequests(instanceId, {
    poll: true,
  })

  const statusDeltas = useDevboxInstanceStatusDeltaSubscription({
    variables: { id: instanceId },
    skip: !instanceId,
  })
  const threadDeltas = useDevboxThreadDeltaSubscription({
    variables: { instanceId },
    skip: !instanceId,
    onData: ({ data: { data } }) => {
      const delta = data?.devboxThreadDelta?.delta
      if (delta && delta !== Delta.Update) refetch()
    },
  })

  // approvals and questions the agent is blocked on arrive here, not as thread
  // deltas, as do the threads and subagents the agent starts itself
  const indexDeltas = useDevboxInstanceIndexDeltaSubscription({
    variables: { instanceId },
    skip: !instanceId,
    onData: ({ client, data: { data } }) => {
      const payload = data?.devboxInstanceIndexDelta?.payload
      mergePendingInteractions(
        client.cache,
        instanceId,
        (payload?.interactions ?? []).filter(isNonNullable)
      )
      mergeNewThreads(
        client.cache,
        instanceId,
        (payload?.threads ?? []).filter(isNonNullable)
      )
    },
  })

  // each delta subscription missed updates while it was down, so a recovery
  // refetches the instance (the timeline store reloads its own sessions)
  const recovery = { skip: !instanceId, onRecover: refetch }
  const deltasDown = [
    useSubscriptionRecovery(statusDeltas, recovery),
    useSubscriptionRecovery(threadDeltas, recovery),
    useSubscriptionRecovery(indexDeltas, recovery),
  ].some(Boolean)

  const live = isInstanceLive(instance?.status)
  const { viewedFile, selectFile, change, selectChange, openFile } =
    useDevboxPanel()
  const api = useDevboxWorkspaceApi(instanceId)
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
  useStatusFallback(query, {
    settling:
      resuming ||
      instance?.status === DevboxInstanceStatus.Pending ||
      instance?.status === DevboxInstanceStatus.Provisioning,
    live,
  })

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

  // a pull request an agent opened mid-turn arrives as a live delta
  const announcedPrs = timeline.store.pullRequests.length
  useEffect(() => {
    if (announcedPrs) refetchPullRequests()
  }, [announcedPrs, refetchPullRequests])

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
    deltasDown || timeline.subscriptionDown || isClusterOfflineError(error)

  return (
    <ViewSC>
      <MainSC>
        <HeaderBarSC>
          <DevboxInstanceHeader
            instance={instance}
            maxDeferralSeconds={maxDeferral}
            now={now}
            resuming={resuming}
            onResume={() => resume({ variables: { id: instance.id } })}
            onImportSession={() => setImportOpen(true)}
          />
        </HeaderBarSC>
        {live && change ? (
          <DevboxChangesViewer
            instanceId={instanceId}
            change={change}
            onOpenFile={openFile}
            onClose={() => selectChange(null)}
          />
        ) : live && viewedFile ? (
          <DevboxFileViewer
            key={viewedFile}
            api={api}
            path={viewedFile}
            onClose={() => selectFile(null)}
          />
        ) : (
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
                      for (const deltas of [
                        statusDeltas,
                        threadDeltas,
                        indexDeltas,
                      ])
                        deltas.restart()
                      timeline.restartSubscription()
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
        )}
      </MainSC>
      <DevboxPanelRail instance={instance} />
      {importOpen && (
        <ImportThreadModal
          instance={instance}
          onClose={() => setImportOpen(false)}
          onImported={selectThread}
        />
      )}
    </ViewSC>
  )
}

const SETTLING_POLL_INTERVAL = 5_000

// Status reaches the page by subscription, which only starts after the first
// fetch, so a box that came up in between would look like it's starting forever.
// Polls while the status should be changing, and refetches the full instance
// (agents, billing, threads) once it's live, as status deltas carry only part of it.
function useStatusFallback(
  {
    refetch,
    startPolling,
    stopPolling,
  }: Pick<
    ReturnType<typeof useDevboxInstanceQuery>,
    'refetch' | 'startPolling' | 'stopPolling'
  >,
  { settling, live }: { settling: boolean; live: boolean }
) {
  useEffect(() => {
    if (!settling) return
    startPolling(SETTLING_POLL_INTERVAL)
    return () => stopPolling()
  }, [settling, startPolling, stopPolling])

  const wasLive = useRef(live)
  useEffect(() => {
    if (live && !wasLive.current) refetch()
    wasLive.current = live
  }, [live, refetch])
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

const ViewSC = styled.div({
  display: 'flex',
  flex: 1,
  height: '100%',
  minHeight: 0,
  minWidth: 0,
})

const MainSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
  minHeight: 0,
})

const HeaderBarSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  flexShrink: 0,
  boxSizing: 'border-box',
  height: DEVBOX_HEADER_HEIGHT,
  padding: `0 ${theme.spacing.large}`,
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
