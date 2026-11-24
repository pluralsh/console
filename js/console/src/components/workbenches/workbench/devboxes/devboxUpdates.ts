import {
  DevboxInstanceStatus,
  DevboxInstanceTinyFragment,
  DevboxRebaseState,
  DevboxUpdateCampaignFragment,
  DevboxUpdateCampaignStatus,
  DevboxUpdateMode,
} from 'generated/graphql'
import dayjs from 'dayjs'
import { formatDateTime } from 'utils/datetime'

// what the update state of an instance needs
export type UpdatableInstance = Pick<
  DevboxInstanceTinyFragment,
  | 'status'
  | 'outdated'
  | 'rebaseState'
  | 'rebaseError'
  | 'rebaseRevision'
  | 'templateRevision'
  | 'daemonVersion'
  | 'updateDeadlineAt'
> & {
  devbox?: Nullable<
    Pick<
      NonNullable<DevboxInstanceTinyFragment['devbox']>,
      'revision' | 'daemonVersion'
    >
  >
}

// what an update costs, said the same way wherever one is offered
export const UPDATE_KEEPS =
  'Your home directory, repositories and threads are kept.'
export const UPDATE_LOSES =
  'Running processes and anything installed outside the home directory are lost.'
export const BOOT_SCRIPT_HINT =
  'To reinstall things after every restart, put the commands in ~/.config/devbox/boot.sh.'

// an update is on its way; the gateway reports when it lands
export const isUpdating = (i: Pick<UpdatableInstance, 'rebaseState'>) =>
  i.rebaseState === DevboxRebaseState.InProgress

// a user can only update an instance the gateway can move: running or suspended
export const canUpdate = (i: UpdatableInstance) =>
  !!i.outdated &&
  !isUpdating(i) &&
  (i.status === DevboxInstanceStatus.Running ||
    i.status === DevboxInstanceStatus.Suspended)

// the last update failed and the instance is still on the revision it had
export const updateFailed = (i: UpdatableInstance) =>
  i.rebaseState === DevboxRebaseState.Failed && !!i.outdated

type UpdateChip = {
  label: string
  severity: 'info' | 'warning' | 'danger'
  tooltip: string
}

// the one chip an instance shows about updates, most urgent first
export function updateChip(i: UpdatableInstance): Nullable<UpdateChip> {
  if (isUpdating(i))
    return {
      label: 'Updating',
      severity: 'info',
      tooltip:
        i.status === DevboxInstanceStatus.Suspended
          ? 'Moving to the new version. It starts there the next time it is resumed.'
          : 'Restarting on the new version.',
    }
  if (updateFailed(i))
    return {
      label: 'Update failed',
      severity: 'danger',
      tooltip:
        `The instance went back to the version it had. ${i.rebaseError ?? ''}`.trim(),
    }
  if (i.outdated)
    return {
      label: 'Update available',
      severity: 'warning',
      tooltip: versionChange(i),
    }
  return null
}

// "devbox-daemon 0.12.0 → 0.12.1" when the daemon is what changed, else that the image did
export function versionChange(i: UpdatableInstance): string {
  const [from, to] = [i.daemonVersion, i.devbox?.daemonVersion]
  if (to && from !== to)
    return from
      ? `devbox-daemon ${from} → ${to}`
      : `A newer devbox runtime (devbox-daemon ${to}) is available`
  return "The box's image changed since this instance started"
}

export function updateConfirmText(i: Pick<UpdatableInstance, 'status'>) {
  const when =
    i.status === DevboxInstanceStatus.Suspended
      ? "The instance starts on the box's current version the next time it is resumed."
      : "The instance restarts now on the box's current version."
  return `${when} ${UPDATE_KEEPS} ${UPDATE_LOSES} ${BOOT_SCRIPT_HINT}`
}

// the forced-update notice: "in 12 minutes", "in under a minute", "any moment now"
export function deadlineText(deadline: string, now: Date): string {
  const seconds = dayjs(deadline).diff(now, 'second')
  if (seconds <= 0) return 'any moment now'
  if (seconds < 60) return 'in under a minute'
  const minutes = Math.round(seconds / 60)
  return `in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
}

export const updateModeLabel = (mode: Nullable<DevboxUpdateMode>) =>
  mode === DevboxUpdateMode.Manual ? 'Manual' : 'On resume'

export const updateModeDescription = (mode: Nullable<DevboxUpdateMode>) =>
  mode === DevboxUpdateMode.Manual
    ? 'Instances stay on their version until a user or an admin updates them.'
    : 'A suspended instance moves to the current version the next time it is resumed.'

export const isCampaignActive = (
  c: Nullable<Pick<DevboxUpdateCampaignFragment, 'status'>>
) =>
  c?.status === DevboxUpdateCampaignStatus.Pending ||
  c?.status === DevboxUpdateCampaignStatus.Running

// one line on where a campaign stands
export function campaignSummary(
  c: Pick<
    DevboxUpdateCampaignFragment,
    'status' | 'force' | 'progress' | 'deadlineAt' | 'startsAt'
  >,
  now: Date
): string {
  const { outdated = 0, updated = 0, failed = 0 } = c.progress ?? {}
  const counts = [
    `${updated} updated`,
    failed ? `${failed} failed` : null,
    `${outdated} still outdated`,
  ]
    .filter(Boolean)
    .join(', ')
  if (c.status === DevboxUpdateCampaignStatus.Cancelled)
    return `Cancelled: ${counts}`
  if (c.status === DevboxUpdateCampaignStatus.Completed)
    return `Finished: ${counts}`
  if (c.startsAt && dayjs(c.startsAt).isAfter(now))
    return `Starts ${formatDateTime(c.startsAt)}`
  if (c.force && c.deadlineAt && dayjs(c.deadlineAt).isAfter(now))
    return `Instances in use restart ${deadlineText(c.deadlineAt, now)}: ${counts}`
  return `Running: ${counts}`
}

export const NOTICE_MINUTES = { min: 10, max: 30, default: 15 }
