import {
  Button,
  Callout,
  Flex,
  ReloadIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP } from 'components/utils/typography/Text'
import {
  Delta,
  DevboxInstanceStatus,
  DevboxThreadKind,
  DevboxThreadStatus,
  useDevboxInstanceQuery,
  useDevboxInstanceStatusDeltaSubscription,
  useDevboxPullRequestsQuery,
  useDevboxThreadDeltaSubscription,
  useResumeDevboxInstanceMutation,
  useWorkbenchDevboxesQuery,
} from 'generated/graphql'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  getWorkbenchDevboxesAbsPath,
  getWorkbenchDevboxInstanceAbsPath,
  WORKBENCH_DEVBOX_INSTANCE_PARAM_ID,
  WORKBENCH_DEVBOX_POSITION_QUERY_PARAM,
  WORKBENCH_DEVBOX_TAB_QUERY_PARAM,
  WORKBENCH_DEVBOX_THREAD_QUERY_PARAM,
  WORKBENCHES_ABS_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { WorkbenchEmptyState } from '../../common/WorkbenchEmptyState'
import { DevboxBrowserTab } from './DevboxBrowserTab'
import { isClusterOfflineError } from './devboxErrors'
import { DevboxFilesTab } from './DevboxFilesTab'
import {
  effectiveMaxDeferral,
  getDevboxAwakeStatus,
  isInstanceLive,
} from './devboxIdle'
import { DevboxInstanceHeader } from './DevboxInstanceHeader'
import { DevboxRepositoriesTab } from './DevboxRepositoriesTab'
import { DevboxTerminalTab } from './DevboxTerminalTab'
import { DevboxThreadPane } from './DevboxThreadPane'
import { DevboxThreadsSidebar } from './DevboxThreadsSidebar'
import { useDevboxWorkspaceApi } from './devboxWorkspaceApi'
import { useDevboxPresence } from './useDevboxPresence'
import { useDevboxTimelineStore } from './useDevboxTimeline'

export const DEVBOX_TABS = [
  { key: 'chat', label: 'Chat' },
  { key: 'terminal', label: 'Terminal' },
  { key: 'files', label: 'Files' },
  { key: 'browser', label: 'Browser' },
  { key: 'repositories', label: 'Repositories' },
] as const
type DevboxTab = (typeof DEVBOX_TABS)[number]['key']

export function DevboxInstanceWorkspace() {
  const instanceId = useParams()[WORKBENCH_DEVBOX_INSTANCE_PARAM_ID] ?? ''
  const [params, setParams] = useSearchParams()
  const { popToast } = useSimpleToast()
  const tab = (params.get(WORKBENCH_DEVBOX_TAB_QUERY_PARAM) ??
    'chat') as DevboxTab
  const threadParam = params.get(WORKBENCH_DEVBOX_THREAD_QUERY_PARAM)
  const positionParam = params.get(WORKBENCH_DEVBOX_POSITION_QUERY_PARAM)
  const position = positionParam ? Number(positionParam) : null

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

  const threads = useMemo(
    () => (instance?.threads ?? []).filter(isNonNullable),
    [instance?.threads]
  )
  const topLevel = threads.filter((t) => t.kind !== DevboxThreadKind.Subagent)
  const selected =
    threads.find((t) => t.id === threadParam) ??
    topLevel.find((t) => t.status !== DevboxThreadStatus.Deleted)
  const unread = useUnreadThreads(threads, selected?.id)

  useSetBreadcrumbs(
    useMemo(
      () => [
        { label: 'workbenches', url: WORKBENCHES_ABS_PATH },
        {
          label: instance?.workbench?.name ?? 'workbench',
          url: getWorkbenchAbsPath(workbenchId),
        },
        { label: 'devboxes', url: getWorkbenchDevboxesAbsPath(workbenchId) },
        {
          label: instance?.name || 'instance',
          url: getWorkbenchDevboxInstanceAbsPath({ workbenchId, instanceId }),
        },
      ],
      [instance?.name, instance?.workbench?.name, instanceId, workbenchId]
    )
  )

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

  if (!instance) {
    if (loading) return <RectangleSkeleton $height={480} />
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

  const maxDeferral = effectiveMaxDeferral(
    instance.devbox?.idlePolicy?.maxDeferral,
    workbenchData?.workbench?.configuration?.devbox?.maxDeferral
  )
  const disconnected =
    !!statusError ||
    !!timeline.subscriptionError ||
    isClusterOfflineError(error)

  return (
    <WorkspaceSC>
      <DevboxInstanceHeader
        instance={instance}
        awake={awake!}
        maxDeferralSeconds={maxDeferral}
        now={now}
        pullRequests={pullRequests}
        resuming={resuming}
        onResume={() => resume({ variables: { id: instance.id } })}
      />
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
              Showing the last known state. Reconnect to catch up on anything
              missed.
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
      <TabsSC role="tablist">
        {DEVBOX_TABS.map((t) => (
          <TabButtonSC
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            $active={tab === t.key}
            onClick={() =>
              setParam(
                WORKBENCH_DEVBOX_TAB_QUERY_PARAM,
                t.key === 'chat' ? null : t.key
              )
            }
          >
            {t.label}
          </TabButtonSC>
        ))}
      </TabsSC>
      <BodySC>
        {tab === 'chat' ? (
          <>
            <SidebarColumnSC>
              <DevboxThreadsSidebar
                instance={instance}
                selectedThreadId={selected?.id}
                unread={unread}
                disabled={!live}
                onSelect={(id) =>
                  setParam(WORKBENCH_DEVBOX_THREAD_QUERY_PARAM, id)
                }
              />
            </SidebarColumnSC>
            <MainColumnSC>
              {selected ? (
                <DevboxThreadPane
                  key={selected.id}
                  instance={instance}
                  thread={selected}
                  timeline={timeline}
                  position={selected.id === threadParam ? position : null}
                />
              ) : (
                <CaptionP $color="text-xlight">
                  {live
                    ? 'Start a thread to talk to the agent.'
                    : 'This instance has no threads.'}
                </CaptionP>
              )}
            </MainColumnSC>
          </>
        ) : (
          <MainColumnSC>
            {tab === 'terminal' && (
              <DevboxTerminalTab
                api={api}
                live={live}
              />
            )}
            {tab === 'files' && (
              <DevboxFilesTab
                api={api}
                live={live}
              />
            )}
            {tab === 'browser' && (
              <DevboxBrowserTab
                api={api}
                live={live}
                browserEnabled={!!instance.devbox?.browser}
              />
            )}
            {tab === 'repositories' && (
              <DevboxRepositoriesTab
                instance={instance}
                api={api}
                live={live}
              />
            )}
          </MainColumnSC>
        )}
      </BodySC>
    </WorkspaceSC>
  )
}

// a thread is unread when it has activity the viewer hasn't opened since
function useUnreadThreads(
  threads: { id: string; lastActivityAt?: Nullable<string> }[],
  selectedId: Nullable<string>
) {
  // the last activity the user saw per thread; first sight counts as read
  const [seen, setSeen] = useState<Record<string, string>>({})
  const newlySeen = Object.fromEntries(
    threads
      .filter((t) => !(t.id in seen) || t.id === selectedId)
      .map((t) => [t.id, t.lastActivityAt ?? ''])
      .filter(([id, activity]) => seen[id] !== activity)
  )
  if (Object.keys(newlySeen).length) setSeen({ ...seen, ...newlySeen })
  return new Set(
    threads
      .filter(
        (t) =>
          t.id !== selectedId &&
          t.id in seen &&
          (t.lastActivityAt ?? '') > seen[t.id]
      )
      .map((t) => t.id)
  )
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

const WorkspaceSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  height: '100%',
  padding: theme.spacing.large,
  minHeight: 0,
}))

const TabsSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xsmall,
  borderBottom: theme.borders.default,
}))

const TabButtonSC = styled.button<{ $active: boolean }>(
  ({ theme, $active }) => ({
    ...theme.partials.text.body2Bold,
    padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
    background: 'none',
    border: 'none',
    borderBottom: `2px solid ${$active ? theme.colors['border-primary'] : 'transparent'}`,
    color: $active ? theme.colors.text : theme.colors['text-xlight'],
    cursor: 'pointer',
  })
)

const BodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  minHeight: 0,
  gap: theme.spacing.medium,
}))

const SidebarColumnSC = styled.div(({ theme }) => ({
  width: 300,
  flexShrink: 0,
  borderRight: theme.borders.default,
}))

const MainColumnSC = styled.div({
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',
})
