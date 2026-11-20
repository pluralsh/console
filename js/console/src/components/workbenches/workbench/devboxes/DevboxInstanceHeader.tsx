import {
  Button,
  CameraIcon,
  Chip,
  DownloadIcon,
  Flex,
  ICON_FRAME_ICON_SIZE,
  Input,
  ListBoxItem,
  Modal,
  MoonIcon,
  PlayIcon,
  StopIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { MoreMenu } from 'components/utils/MoreMenu'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StackedText } from 'components/utils/table/StackedText'
import {
  DevboxInstanceFragment,
  DevboxInstanceStatus,
  DevboxPullRequestFragment,
  useCancelDevboxInstanceMutation,
  useCancelDevboxKeepAwakeMutation,
  useCreateDevboxSnapshotMutation,
  useKeepDevboxInstanceAwakeMutation,
  useSuspendDevboxInstanceMutation,
} from 'generated/graphql'
import { useState } from 'react'
import { isNonNullable } from 'utils/isNonNullable'
import { billingBadgeLabel, toBillingMode } from './devboxCredentials'
import { DevboxPrChips } from './DevboxChips'
import { isInstanceLive, isInstanceTerminal } from './devboxIdle'
import { DevboxKeepAwakeMenu } from './DevboxKeepAwakeMenu'
import { agentLabel, findAgent, modelDisplayNameOf } from './devboxStartForm'

export function DevboxInstanceHeader({
  instance,
  maxDeferralSeconds,
  now,
  pullRequests,
  onResume,
  resuming,
  onImportSession,
}: {
  instance: DevboxInstanceFragment
  maxDeferralSeconds: number
  now: Date
  pullRequests: DevboxPullRequestFragment[]
  onResume: () => void
  resuming: boolean
  onImportSession?: () => void
}) {
  const { popToast } = useSimpleToast()
  const [stopOpen, setStopOpen] = useState(false)
  const [snapshotOpen, setSnapshotOpen] = useState(false)
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

  const actions = [
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
  ].filter((a) => !!a)

  return (
    <Flex
      direction="column"
      gap="xsmall"
    >
      <Flex
        justify="space-between"
        align="center"
        gap="medium"
      >
        <Flex
          gap="small"
          align="center"
          css={{ minWidth: 0 }}
        >
          <StackedText
            truncate
            first={instance.name || instance.id.slice(0, 8)}
            firstPartialType="body2Bold"
            firstColor="text"
            second={[
              instance.devbox?.name,
              agentLabel(instance.agent),
              modelDisplayNameOf(
                findAgent(instance.devbox, instance.agent),
                instance.requestedModel
              ),
              instance.user?.name && `started by ${instance.user.name}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        </Flex>
        <Flex
          gap="xsmall"
          align="center"
          css={{ flexShrink: 0 }}
        >
          {live && (
            <DevboxKeepAwakeMenu
              keepAwakeUntil={instance.keepAwakeUntil}
              maxDeferralSeconds={maxDeferralSeconds}
              now={now}
              loading={keepAwakeState.loading || cancelKeepAwakeState.loading}
              onKeepAwake={(until) =>
                keepAwake({
                  variables: { id: instance.id, until: until.toISOString() },
                })
              }
              onCancel={() =>
                cancelKeepAwake({ variables: { id: instance.id } })
              }
            />
          )}
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
              disabled={suspendState.loading}
              onSelectionChange={(key) => {
                if (key === 'snapshot') setSnapshotOpen(true)
                if (key === 'import') onImportSession?.()
                if (key === 'suspend')
                  suspend({ variables: { id: instance.id } })
                if (key === 'stop') setStopOpen(true)
              }}
            >
              {actions.map((a) => (
                <ListBoxItem
                  key={a.key}
                  label={a.label}
                  leftContent={a.icon}
                  disabled={a.disabled}
                  destructive={a.destructive}
                />
              ))}
            </MoreMenu>
          )}
        </Flex>
      </Flex>
      {(!!badges.length || !!pullRequests.length) && (
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
          <DevboxPrChips pullRequests={pullRequests} />
        </Flex>
      )}
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
      {snapshotOpen && (
        <SnapshotModal
          instance={instance}
          onClose={() => setSnapshotOpen(false)}
        />
      )}
    </Flex>
  )
}

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
