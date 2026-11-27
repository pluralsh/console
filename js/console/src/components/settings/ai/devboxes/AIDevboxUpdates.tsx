import {
  Button,
  Callout,
  Card,
  Chip,
  Flex,
  FormField,
  Input,
  Modal,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import {
  campaignSummary,
  isCampaignActive,
  NOTICE_MINUTES,
  UPDATE_KEEPS,
  UPDATE_LOSES,
  updateModeDescription,
  updateModeLabel,
} from 'components/workbenches/workbench/devboxes/devboxUpdates'
import { shortDigest } from 'components/workbenches/workbench/devboxes/DevboxChips'
import { useNow } from 'components/workbenches/workbench/devboxes/DevboxUpdateNotice'
import {
  DevboxUpdateCampaignFragment,
  useCancelDevboxUpdateCampaignMutation,
  useCreateDevboxUpdateCampaignMutation,
  useDevboxUpdatesQuery,
} from 'generated/graphql'
import { ReactNode, useState } from 'react'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'

const POLL_INTERVAL = 15_000

// How a box's instances follow its current version, and the admin's levers when they don't: update every
// outdated instance nobody is using, or force all of them (a security fix) after warning their users.
export function AIDevboxUpdates({ devboxId }: { devboxId: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [forceOpen, setForceOpen] = useState(false)
  const now = useNow(true)
  const { data, error } = useDevboxUpdatesQuery({
    variables: { id: devboxId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const refetchQueries = ['DevboxUpdates']
  const [create, createState] = useCreateDevboxUpdateCampaignMutation({
    refetchQueries,
    onCompleted: () => {
      setConfirmOpen(false)
      setForceOpen(false)
    },
  })
  const [cancel, cancelState] = useCancelDevboxUpdateCampaignMutation({
    refetchQueries,
  })

  const box = data?.devbox
  if (error && !box) return <GqlError error={error} />
  if (!box) return null

  const campaigns = (box.updateCampaigns ?? []).filter(isNonNullable)
  const active = campaigns.find(isCampaignActive)
  const outdated = box.outdatedInstances ?? 0
  // an operator from before the runtime sidecar reports neither
  const supported = isNonNullable(box.revision)

  return (
    <Card css={{ padding: 16 }}>
      <Flex
        direction="column"
        gap="medium"
      >
        <GridSC>
          <Prop
            label="Update mode"
            hint={updateModeDescription(box.updateMode)}
          >
            {updateModeLabel(box.updateMode)}
          </Prop>
          <Prop
            label="Daemon version"
            hint="Delivered by the deployment operator, next to the box's image."
          >
            {box.daemonVersion ?? '—'}
          </Prop>
          <Prop label="Runtime image">
            <span title={box.runtimeImage ?? undefined}>
              {shortDigest(box.runtimeImage) ?? '—'}
            </span>
          </Prop>
          <Prop
            label="Outdated instances"
            hint="Live instances on an older revision than the box serves: its image, agents, daemon or settings changed."
          >
            {supported ? outdated : '—'}
          </Prop>
        </GridSC>
        {!supported && (
          <CaptionP $color="text-xlight">
            This box&apos;s deployment operator doesn&apos;t report template
            revisions yet. Upgrade it to update instances from here.
          </CaptionP>
        )}
        {cancelState.error && <GqlError error={cancelState.error} />}
        {active && (
          <Callout
            severity={active.force ? 'warning' : 'info'}
            title={active.force ? 'Forced update running' : 'Update running'}
          >
            <Flex
              gap="small"
              align="center"
              justify="space-between"
            >
              <span>
                {campaignSummary(active, now)}
                {active.reason ? ` (${active.reason})` : ''}
              </span>
              <Button
                small
                secondary
                loading={cancelState.loading}
                onClick={() => cancel({ variables: { id: active.id } })}
              >
                Cancel
              </Button>
            </Flex>
          </Callout>
        )}
        <Flex gap="small">
          <Button
            small
            secondary
            disabled={!supported || !!active || outdated === 0}
            onClick={() => setConfirmOpen(true)}
          >
            Update outdated instances
          </Button>
          <Button
            small
            destructive
            disabled={!supported || !!active || outdated === 0}
            onClick={() => setForceOpen(true)}
          >
            Force update
          </Button>
        </Flex>
        <CampaignHistory
          campaigns={campaigns.filter((c) => !isCampaignActive(c))}
          now={now}
        />
      </Flex>
      <Confirm
        open={confirmOpen}
        close={() => setConfirmOpen(false)}
        label="Update"
        title="Update outdated instances"
        text={`Suspended and idle instances move to the box's current version, a few at a time, over the next 24 hours. Instances in use are left alone. ${UPDATE_KEEPS} ${UPDATE_LOSES}`}
        loading={createState.loading}
        error={createState.error}
        submit={() => create({ variables: { devboxId } })}
      />
      {forceOpen && (
        <ForceUpdateModal
          outdated={outdated}
          loading={createState.loading}
          error={createState.error}
          onClose={() => setForceOpen(false)}
          onSubmit={(attributes) =>
            create({
              variables: {
                devboxId,
                attributes: { ...attributes, force: true },
              },
            })
          }
        />
      )}
    </Card>
  )
}

function CampaignHistory({
  campaigns,
  now,
}: {
  campaigns: DevboxUpdateCampaignFragment[]
  now: Date
}) {
  if (!campaigns.length) return null
  return (
    <Flex
      direction="column"
      gap="xsmall"
    >
      <CaptionP $color="text-xlight">Recent updates</CaptionP>
      {campaigns.map((c) => (
        <Flex
          key={c.id}
          gap="small"
          align="center"
        >
          {c.force && (
            <Chip
              size="small"
              severity="warning"
            >
              forced
            </Chip>
          )}
          <CaptionP>
            {campaignSummary(c, now)}
            {c.reason ? ` (${c.reason})` : ''}
          </CaptionP>
          <CaptionP $color="text-xlight">
            {[c.user?.name ?? c.user?.email, fromNow(c.insertedAt)]
              .filter(Boolean)
              .join(' · ')}
          </CaptionP>
        </Flex>
      ))}
    </Flex>
  )
}

function ForceUpdateModal({
  outdated,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  outdated: number
  loading: boolean
  error: Nullable<Error>
  onClose: () => void
  onSubmit: (attributes: { reason?: string; noticeMinutes: number }) => void
}) {
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState(`${NOTICE_MINUTES.default}`)
  const minutes = Number(notice)
  const valid =
    Number.isInteger(minutes) &&
    minutes >= NOTICE_MINUTES.min &&
    minutes <= NOTICE_MINUTES.max

  return (
    <Modal
      open
      onClose={onClose}
      header="Force update"
      actions={
        <Flex gap="small">
          <Button
            secondary
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            destructive
            loading={loading}
            disabled={!valid}
            onClick={() =>
              onSubmit({
                reason: reason.trim() || undefined,
                noticeMinutes: minutes,
              })
            }
          >
            Force update
          </Button>
        </Flex>
      }
    >
      <Flex
        direction="column"
        gap="medium"
      >
        {error && <GqlError error={error} />}
        <span>
          This restarts all {outdated} outdated{' '}
          {outdated === 1 ? 'instance' : 'instances'} of this box, including the
          ones in use. Their users are warned first and can restart sooner.
          Suspended and idle instances are updated right away. {UPDATE_KEEPS}{' '}
          {UPDATE_LOSES}
        </span>
        <FormField
          label="Reason"
          hint="Shown to the users whose instances restart"
        >
          <Input
            value={reason}
            placeholder="Security fix in the devbox runtime"
            onChange={(e) => setReason(e.target.value)}
          />
        </FormField>
        <FormField
          label="Notice (minutes)"
          hint={`How long users are warned before their instance restarts, ${NOTICE_MINUTES.min} to ${NOTICE_MINUTES.max}`}
          error={!valid}
        >
          <Input
            value={notice}
            inputProps={{ inputMode: 'numeric' }}
            onChange={(e) => setNotice(e.target.value)}
          />
        </FormField>
      </Flex>
    </Modal>
  )
}

function Prop({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <CaptionP $color="text-xlight">{label}</CaptionP>
      <Body2BoldP css={{ wordBreak: 'break-all' }}>{children}</Body2BoldP>
      {hint && <CaptionP $color="text-xlight">{hint}</CaptionP>}
    </div>
  )
}

const GridSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: theme.spacing.medium,
}))
