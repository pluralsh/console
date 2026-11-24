import {
  Button,
  CameraIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ClockIcon,
  Chip,
  DownloadIcon,
  Flex,
  GitCompareIcon,
  ICON_FRAME_ICON_SIZE,
  Input,
  ListBoxItem,
  Modal,
  MoonIcon,
  PlayIcon,
  StopIcon,
  Tooltip,
  UpdatesIcon,
} from '@pluralsh/design-system'
import dayjs from 'dayjs'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { MoreMenu } from 'components/utils/MoreMenu'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StackedText } from 'components/utils/table/StackedText'
import {
  DevboxInstanceFragment,
  DevboxInstanceStatus,
  useCancelDevboxInstanceMutation,
  useCancelDevboxKeepAwakeMutation,
  useCreateDevboxSnapshotMutation,
  useKeepDevboxInstanceAwakeMutation,
  useRebaseDevboxInstanceMutation,
  useSuspendDevboxInstanceMutation,
} from 'generated/graphql'
import { ReactNode, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { WORKBENCH_DEVBOX_THREAD_QUERY_PARAM } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { formatDateTime, fromNow } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import { billingBadgeLabel, toBillingMode } from './devboxCredentials'
import { useDevboxChangeStat } from './devboxChanges'
import { useDevboxPanel } from './DevboxControlPanel'
import { DevboxCreatePrButton } from './DevboxCreatePrButton'
import { DevboxDiffStat, diffStatLabel } from './DevboxDiffStat'
import { useDevboxPullRequests } from './devboxPullRequests'
import { rootThread, selectedThread } from './devboxThreads'
import { isInstanceLive, isInstanceTerminal } from './devboxIdle'
import { devboxSizing } from './devboxSizing'
import { canUpdate, updateChip, updateConfirmText } from './devboxUpdates'
import { useKeepAwakeActions } from './DevboxKeepAwakeMenu'

type InstanceDetail = { label: string; value: string; tooltip?: string }

// the facts worth a glance: what the box runs on, how long it's been up, and what it works on
export function instanceDetails(
  instance: DevboxInstanceFragment,
  now: Date
): InstanceDetail[] {
  const box = instance.devbox
  const repos = (instance.repositories ?? []).filter(isNonNullable)
  const running = instance.runningThreads ?? 0
  const waiting = instance.waitingThreads ?? 0
  const uptime: Nullable<InstanceDetail> =
    isInstanceLive(instance.status) && instance.awakeSince
      ? {
          label: 'Up',
          value: elapsed(instance.awakeSince, now),
          tooltip: `Awake since ${formatDateTime(instance.awakeSince)}`,
        }
      : instance.status === DevboxInstanceStatus.Suspended &&
          instance.suspendedAt
        ? { label: 'Suspended', value: fromNow(instance.suspendedAt) }
        : isInstanceTerminal(instance.status) && instance.completedAt
          ? { label: 'Ended', value: fromNow(instance.completedAt) }
          : null

  return [
    box?.name && { label: 'Box', value: box.name },
    {
      label: 'Size',
      value: devboxSizing(box?.resources) ?? 'default',
    },
    box?.cluster?.name && { label: 'Cluster', value: box.cluster.name },
    uptime,
    (running || waiting) && {
      label: 'Threads',
      value: [running && `${running} running`, waiting && `${waiting} waiting`]
        .filter(Boolean)
        .join(', '),
    },
    !!repos.length && {
      label: repos.length === 1 ? 'Repo' : 'Repos',
      value: repos.length === 1 ? repoName(repos[0]) : `${repos.length}`,
    },
    instance.snapshot && {
      label: 'From snapshot',
      value: instance.snapshot.name || instance.snapshot.id.slice(0, 8),
    },
    (instance.viewerCount ?? 0) > 1 && {
      label: 'Watching',
      value: `${instance.viewerCount}`,
    },
  ].filter((d): d is InstanceDetail => !!d)
}

// e.g. "3d 4h", "2h 15m", "<1m"
function elapsed(from: string, now: Date) {
  const minutes = Math.max(0, dayjs(now).diff(from, 'minute'))
  const [d, h, m] = [
    Math.floor(minutes / 1440),
    Math.floor((minutes % 1440) / 60),
    minutes % 60,
  ]
  if (d) return h ? `${d}d ${h}h` : `${d}d`
  if (h) return m ? `${h}h ${m}m` : `${h}h`
  return m ? `${m}m` : '<1m'
}

type MenuAction = {
  key: string
  label: string
  description?: string
  icon: ReactNode
  right?: ReactNode
  disabled?: boolean
  destructive?: boolean
}

const AWAKE_MENU_KEY = 'awake-menu'
const AWAKE_BACK_KEY = 'awake-back'

const repoName = (url: string) =>
  url
    .replace(/\.git$/, '')
    .split(/[/:]/)
    .slice(-2)
    .join('/')

export function DevboxInstanceHeader({
  instance,
  maxDeferralSeconds,
  now,
  onResume,
  resuming,
  onImportSession,
}: {
  instance: DevboxInstanceFragment
  maxDeferralSeconds: number
  now: Date
  onResume: () => void
  resuming: boolean
  onImportSession?: () => void
}) {
  const { popToast } = useSimpleToast()
  const [stopOpen, setStopOpen] = useState(false)
  const [updateOpen, setUpdateOpen] = useState(false)
  const [snapshotOpen, setSnapshotOpen] = useState(false)
  const [submenu, setSubmenu] = useState(false)
  const live = isInstanceLive(instance.status)
  const terminal = isInstanceTerminal(instance.status)
  const suspended = instance.status === DevboxInstanceStatus.Suspended

  const onError = (e: Error) =>
    popToast({ content: e.message, severity: 'danger' })
  const [keepAwake, keepAwakeState] = useKeepDevboxInstanceAwakeMutation({
    onError,
  })
  const [cancelKeepAwake, cancelKeepAwakeState] =
    useCancelDevboxKeepAwakeMutation({ onError })
  const [suspend, suspendState] = useSuspendDevboxInstanceMutation({ onError })
  const [stop, stopState] = useCancelDevboxInstanceMutation({
    onCompleted: () => setStopOpen(false),
  })
  const [update, updateState] = useRebaseDevboxInstanceMutation({
    onCompleted: () => {
      setUpdateOpen(false)
      popToast({ content: 'Update started', severity: 'success' })
    },
  })
  const updateStatus = updateChip(instance)

  const billing = (instance.agentBilling ?? []).filter(isNonNullable)
  const badges = (
    billing.length
      ? billing
      : (instance.agentConnections ?? [])
          .filter(isNonNullable)
          .map((c) => ({ agent: c.agent, billing: toBillingMode(c.billing) }))
  )
    .map((b) => billingBadgeLabel(b, instance.user?.name))
    .filter(isNonNullable)

  const details = instanceDetails(instance, now)
  const keepAwakeActions = useKeepAwakeActions({
    keepAwakeUntil: instance.keepAwakeUntil,
    maxDeferralSeconds,
    now,
    onKeepAwake: (until) =>
      keepAwake({
        variables: { id: instance.id, until: until.toISOString() },
      }),
    onCancel: () => cancelKeepAwake({ variables: { id: instance.id } }),
  })

  const awakeActions: MenuAction[] = [
    ...keepAwakeActions.items,
    {
      key: AWAKE_BACK_KEY,
      label: 'Back',
      icon: <CaretLeftIcon size={ICON_FRAME_ICON_SIZE.small} />,
    },
  ]
  const mainActions = (
    [
      live && {
        key: AWAKE_MENU_KEY,
        label: 'Keep awake',
        icon: <ClockIcon size={ICON_FRAME_ICON_SIZE.small} />,
        right: <CaretRightIcon size={ICON_FRAME_ICON_SIZE.small} />,
      },
      live && {
        key: 'snapshot',
        label: 'Take snapshot',
        icon: <CameraIcon size={ICON_FRAME_ICON_SIZE.small} />,
        disabled: instance.status === DevboxInstanceStatus.Snapshotting,
      },
      live &&
        onImportSession && {
          key: 'import',
          label: 'Import a session',
          icon: <DownloadIcon size={ICON_FRAME_ICON_SIZE.small} />,
        },
      live && {
        key: 'suspend',
        label: 'Suspend',
        icon: <MoonIcon size={ICON_FRAME_ICON_SIZE.small} />,
      },
      canUpdate(instance) && {
        key: 'update',
        label: 'Update instance',
        description: updateStatus?.tooltip,
        icon: <UpdatesIcon size={ICON_FRAME_ICON_SIZE.small} />,
      },
      !terminal && {
        key: 'stop',
        label: 'Stop instance',
        icon: (
          <StopIcon
            size={ICON_FRAME_ICON_SIZE.small}
            color="icon-danger"
          />
        ),
        destructive: true,
      },
    ] as (MenuAction | false | undefined)[]
  ).filter((a): a is MenuAction => !!a)
  const actions = submenu ? awakeActions : mainActions

  return (
    <Flex
      justify="space-between"
      align="center"
      gap="medium"
      css={{ minWidth: 0 }}
    >
      <Flex
        direction="column"
        gap="xsmall"
        css={{ minWidth: 0 }}
      >
        <StackedText
          truncate
          first={<span>{instance.name || instance.id.slice(0, 8)}</span>}
          firstPartialType="body2Bold"
          firstColor="text"
        />
        {!!details.length && (
          <DetailsSC>
            {details.map(({ label, value, tooltip }) => {
              const item = (
                <DetailSC key={label}>
                  <DetailLabelSC>{label}</DetailLabelSC>
                  <span>{value}</span>
                </DetailSC>
              )
              return tooltip ? (
                <Tooltip
                  key={label}
                  label={tooltip}
                  placement="bottom"
                >
                  {item}
                </Tooltip>
              ) : (
                item
              )
            })}
          </DetailsSC>
        )}
        {(!!badges.length || updateStatus) && (
          <Flex
            gap="xsmall"
            align="center"
            wrap="wrap"
          >
            {badges.map((badge) => (
              <Chip
                key={badge}
                size="small"
                severity="info"
              >
                {badge}
              </Chip>
            ))}
            {updateStatus && (
              <Tooltip
                label={updateStatus.tooltip}
                placement="bottom"
              >
                <Chip
                  size="small"
                  severity={updateStatus.severity}
                >
                  {updateStatus.label}
                </Chip>
              </Tooltip>
            )}
          </Flex>
        )}
      </Flex>
      <Flex
        gap="xsmall"
        align="center"
        css={{ flexShrink: 0 }}
      >
        {live && <ChangesButton instanceId={instance.id} />}
        {live && <CreatePrButton instance={instance} />}
        {suspended && (
          <Button
            small
            startIcon={<PlayIcon />}
            loading={resuming}
            onClick={onResume}
          >
            Resume
          </Button>
        )}
        {!!actions.length && (
          <MoreMenu
            disabled={
              suspendState.loading ||
              keepAwakeState.loading ||
              cancelKeepAwakeState.loading
            }
            keepOpenOn={(key) =>
              key === AWAKE_MENU_KEY || key === AWAKE_BACK_KEY
            }
            onOpenChange={(open) => !open && setSubmenu(false)}
            onSelectionChange={(key) => {
              if (key === AWAKE_MENU_KEY) return setSubmenu(true)
              if (key === AWAKE_BACK_KEY) return setSubmenu(false)
              setSubmenu(false)
              if (keepAwakeActions.onSelect(`${key}`)) return
              if (key === 'snapshot') setSnapshotOpen(true)
              if (key === 'import') onImportSession?.()
              if (key === 'suspend') suspend({ variables: { id: instance.id } })
              if (key === 'update') setUpdateOpen(true)
              if (key === 'stop') setStopOpen(true)
            }}
          >
            {actions.map((a) => (
              <ListBoxItem
                key={a.key}
                label={a.label}
                description={a.description}
                leftContent={a.icon}
                rightContent={a.right}
                disabled={a.disabled}
                destructive={a.destructive}
              />
            ))}
          </MoreMenu>
        )}
      </Flex>
      <Confirm
        open={stopOpen}
        close={() => setStopOpen(false)}
        destructive
        label="Stop"
        title="Stop instance"
        text="Stopping ends the instance and discards anything not pushed or snapshotted. Transcripts stay archived."
        loading={stopState.loading}
        error={stopState.error}
        submit={() => stop({ variables: { id: instance.id } })}
      />
      <Confirm
        open={updateOpen}
        close={() => setUpdateOpen(false)}
        label="Update"
        title="Update instance"
        text={updateConfirmText(instance)}
        loading={updateState.loading}
        error={updateState.error}
        submit={() => update({ variables: { id: instance.id } })}
      />
      {keepAwakeActions.modal}
      {snapshotOpen && (
        <SnapshotModal
          instance={instance}
          onClose={() => setSnapshotOpen(false)}
        />
      )}
    </Flex>
  )
}

// the instance's outstanding changes, opening them in the panel
function ChangesButton({ instanceId }: { instanceId: string }) {
  const stat = useDevboxChangeStat(instanceId, true)
  const { setOpen, setTab } = useDevboxPanel()
  if (!stat.files) return null
  return (
    <Button
      small
      secondary
      startIcon={<GitCompareIcon />}
      aria-label={`View changes: ${diffStatLabel(stat)}`}
      onClick={() => {
        setTab('changes')
        setOpen(true)
      }}
    >
      <Flex
        gap="xsmall"
        align="center"
      >
        <span>
          {stat.files} {stat.files === 1 ? 'file' : 'files'}
        </span>
        <DevboxDiffStat stat={stat} />
      </Flex>
    </Button>
  )
}

// the pr is credited to the thread in view (a subagent's to the thread it
// works for), so its row shows the open-pr icon
function CreatePrButton({ instance }: { instance: DevboxInstanceFragment }) {
  const [params] = useSearchParams()
  const { refetch } = useDevboxPullRequests(instance.id)
  const thread = rootThread(
    instance.threads,
    selectedThread(
      instance.threads,
      params.get(WORKBENCH_DEVBOX_THREAD_QUERY_PARAM)
    )
  )
  return (
    <DevboxCreatePrButton
      instanceId={instance.id}
      threadId={thread?.id}
      agentsRunning={(instance.runningThreads ?? 0) > 0}
      onCreated={() => refetch()}
    />
  )
}

// one line, ellipsized; items stay inline so the ellipsis can cut mid-item
const DetailsSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  minWidth: 0,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  color: theme.colors['text-light'],
}))

const DetailSC = styled.span(({ theme }) => ({
  '&:not(:last-child)': { marginRight: theme.spacing.large },
}))

const DetailLabelSC = styled.span(({ theme }) => ({
  marginRight: theme.spacing.xsmall,
  color: theme.colors['text-xlight'],
}))

function SnapshotModal({
  instance,
  onClose,
}: {
  instance: DevboxInstanceFragment
  onClose: () => void
}) {
  const { popToast } = useSimpleToast()
  const [name, setName] = useState('')
  const [create, { loading, error }] = useCreateDevboxSnapshotMutation({
    onCompleted: () => {
      popToast({ content: 'Snapshot started', severity: 'success' })
      onClose()
    },
  })
  return (
    <Modal
      open
      onClose={onClose}
      header="Snapshot instance"
      actions={
        <Flex gap="small">
          <Button
            secondary
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            loading={loading}
            onClick={() =>
              create({
                variables: {
                  instanceId: instance.id,
                  attributes: name.trim() ? { name: name.trim() } : undefined,
                },
              })
            }
          >
            Take snapshot
          </Button>
        </Flex>
      }
    >
      <Flex
        direction="column"
        gap="small"
      >
        {error && <GqlError error={error} />}
        <span>
          Captures the workspace so a new instance can pick up where this one
          left off. Agents keep running while it's taken.
        </span>
        <Input
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
      </Flex>
    </Modal>
  )
}
