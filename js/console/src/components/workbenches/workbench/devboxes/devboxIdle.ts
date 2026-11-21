import dayjs from 'dayjs'
import {
  DevboxForegroundState,
  DevboxInstanceFragment,
  DevboxInstanceStatus,
  DevboxInstanceTinyFragment,
} from 'generated/graphql'

export const DEFAULT_MAX_DEFERRAL_SECONDS = 12 * 60 * 60
export const SUSPENDING_SOON_SECONDS = 60
export const PRESENCE_HEARTBEAT_MS = 30_000

export type KeepAwakePreset = { key: string; label: string; minutes: number }

export const KEEP_AWAKE_PRESETS: KeepAwakePreset[] = [
  { key: '30m', label: '30 minutes', minutes: 30 },
  { key: '1h', label: '1 hour', minutes: 60 },
  { key: '4h', label: '4 hours', minutes: 4 * 60 },
  { key: '12h', label: '12 hours', minutes: 12 * 60 },
]

// a workbench can only lower the box's ceiling
export function effectiveMaxDeferral(
  boxMaxDeferral: Nullable<number>,
  workbenchMaxDeferral: Nullable<number>
) {
  const limits = [boxMaxDeferral, workbenchMaxDeferral].filter(
    (v): v is number => typeof v === 'number' && v > 0
  )
  return limits.length ? Math.min(...limits) : DEFAULT_MAX_DEFERRAL_SECONDS
}

export function keepAwakeUntil({
  minutes,
  from,
  maxDeferralSeconds,
  now = new Date(),
}: {
  minutes: number
  // extending starts from the current deferral rather than now
  from?: Nullable<string | Date>
  maxDeferralSeconds: number
  now?: Date
}): Date {
  const start = from && dayjs(from).isAfter(now) ? dayjs(from) : dayjs(now)
  const requested = start.add(minutes, 'minute')
  const ceiling = dayjs(now).add(maxDeferralSeconds, 'second')
  return (requested.isAfter(ceiling) ? ceiling : requested).toDate()
}

export function clampCustomKeepAwake(
  until: Date,
  maxDeferralSeconds: number,
  now: Date = new Date()
): { until: Date; error?: string; clamped: boolean } {
  if (!dayjs(until).isAfter(now))
    return { until, clamped: false, error: 'Pick a time in the future' }
  const ceiling = dayjs(now).add(maxDeferralSeconds, 'second')
  if (dayjs(until).isAfter(ceiling))
    return { until: ceiling.toDate(), clamped: true }
  return { until, clamped: false }
}

export function isKeptAwake(
  instance: Pick<DevboxInstanceTinyFragment, 'keepAwakeUntil'>,
  now: Date = new Date()
) {
  return (
    !!instance.keepAwakeUntil && dayjs(instance.keepAwakeUntil).isAfter(now)
  )
}

// devbox.v1 BusyReasonKind, without its prefix
const BUSY_REASON_LABELS: Record<string, string> = {
  agent_turn: 'agent working',
  process_activity: 'build running',
  terminal_job: 'terminal job running',
  interactive_stream: 'someone is connected',
  viewer_lease: 'someone is watching',
  deferral_lease: 'kept awake',
  pending_interaction: 'waiting on you',
}

// a reason's detail can be a bare thread id, so it's only the last resort
export function busyReasonLabel(reason: Record<string, unknown>) {
  const kind = `${reason.kind ?? ''}`.toLowerCase()
  return (
    BUSY_REASON_LABELS[kind] ||
    (reason.thread_id ? BUSY_REASON_LABELS.agent_turn : '') ||
    kind.replace(/_/g, ' ') ||
    (reason.detail as string) ||
    'busy'
  )
}

export type DevboxAwakeTone =
  | 'success'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'danger'

export type DevboxAwakeStatus = {
  label: string
  tone: DevboxAwakeTone
  suspendingSoon: boolean
  suspendsInSeconds: Nullable<number>
}

type AwakeInput = Pick<
  DevboxInstanceTinyFragment,
  'status' | 'keepAwakeUntil' | 'foregroundState' | 'statusReason'
> &
  Partial<Pick<DevboxInstanceTinyFragment, 'awakeSince'>> & {
    idleState?: DevboxInstanceFragment['idleState']
    keepAwakeBy?: DevboxInstanceFragment['keepAwakeBy']
  }

export function getDevboxAwakeStatus(
  instance: AwakeInput,
  { now = new Date(), resuming = false } = {}
): DevboxAwakeStatus {
  const base = { suspendingSoon: false, suspendsInSeconds: null }
  if (resuming) return { ...base, label: 'Resuming…', tone: 'info' }

  switch (instance.status) {
    case DevboxInstanceStatus.Pending:
    case DevboxInstanceStatus.Provisioning:
      return { ...base, label: 'Starting…', tone: 'info' }
    case DevboxInstanceStatus.Snapshotting:
      return { ...base, label: 'Snapshotting…', tone: 'info' }
    case DevboxInstanceStatus.Suspended:
      return { ...base, label: 'Suspended', tone: 'neutral' }
    case DevboxInstanceStatus.Completed:
      return { ...base, label: 'Completed', tone: 'neutral' }
    case DevboxInstanceStatus.Cancelled:
      return { ...base, label: 'Stopped', tone: 'neutral' }
    case DevboxInstanceStatus.Failed:
      return {
        ...base,
        label: instance.statusReason
          ? `Failed · ${instance.statusReason}`
          : 'Failed',
        tone: 'danger',
      }
    default:
      break
  }

  if (instance.foregroundState === DevboxForegroundState.RequiresAction)
    return { ...base, label: 'Awake · needs you', tone: 'warning' }

  if (isKeptAwake(instance, now)) {
    const by = instance.keepAwakeBy?.name
    return {
      ...base,
      label: `Kept awake until ${dayjs(instance.keepAwakeUntil).format('h:mm A')}${by ? ` by ${by}` : ''}`,
      tone: 'success',
    }
  }

  const idle = instance.idleState
  // a deadline from before the instance woke, or long past, belongs to an
  // earlier suspend, not to this run
  const stale =
    !!idle?.suspendsAt &&
    ((!!instance.awakeSince &&
      dayjs(idle.suspendsAt).isBefore(instance.awakeSince)) ||
      dayjs(now).diff(idle.suspendsAt, 'second') > SUSPENDING_SOON_SECONDS)
  if (idle?.idle && idle.suspendsAt && !stale) {
    const seconds = Math.max(0, dayjs(idle.suspendsAt).diff(now, 'second'))
    const mins = Math.ceil(seconds / 60)
    return {
      label:
        seconds < 60
          ? `Idle · suspends in ${seconds}s`
          : `Idle · suspends in ${mins} min`,
      tone: seconds <= SUSPENDING_SOON_SECONDS ? 'warning' : 'neutral',
      suspendingSoon: seconds <= SUSPENDING_SOON_SECONDS,
      suspendsInSeconds: seconds,
    }
  }

  const reason = idle?.busyReasons?.find(Boolean)
  if (reason)
    return {
      ...base,
      label: `Awake · ${busyReasonLabel(reason)}`,
      tone: 'success',
    }
  if (instance.foregroundState === DevboxForegroundState.Running)
    return { ...base, label: 'Awake · agent working', tone: 'success' }
  if (idle?.message)
    return { ...base, label: `Awake · ${idle.message}`, tone: 'success' }
  return { ...base, label: 'Awake', tone: 'success' }
}

export const isInstanceLive = (status: Nullable<DevboxInstanceStatus>) =>
  status === DevboxInstanceStatus.Running ||
  status === DevboxInstanceStatus.Snapshotting

export const isInstanceTerminal = (status: Nullable<DevboxInstanceStatus>) =>
  status === DevboxInstanceStatus.Completed ||
  status === DevboxInstanceStatus.Cancelled ||
  status === DevboxInstanceStatus.Failed
