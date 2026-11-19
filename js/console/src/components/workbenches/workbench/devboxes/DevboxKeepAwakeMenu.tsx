import {
  Button,
  Chip,
  ClockIcon,
  DropdownArrowIcon,
  Flex,
  FormField,
  Input,
  ListBoxItem,
  Modal,
  MoonIcon,
  Select,
} from '@pluralsh/design-system'
import dayjs from 'dayjs'
import { useState } from 'react'
import styled from 'styled-components'
import { awakeToneSeverity } from './DevboxChips'
import {
  clampCustomKeepAwake,
  DevboxAwakeStatus,
  isKeptAwake,
  KEEP_AWAKE_PRESETS,
  keepAwakeUntil,
} from './devboxIdle'

export function DevboxAwakePill({ status }: { status: DevboxAwakeStatus }) {
  return (
    <Chip
      size="small"
      severity={awakeToneSeverity[status.tone]}
      icon={status.tone === 'neutral' ? <MoonIcon /> : undefined}
      data-testid="devbox-awake-pill"
    >
      {status.label}
    </Chip>
  )
}

const DATETIME_LOCAL = 'YYYY-MM-DDTHH:mm'
const CUSTOM = 'custom'
const SLEEP = 'sleep'

export function DevboxKeepAwakeMenu({
  keepAwakeUntil: currentUntil,
  maxDeferralSeconds,
  onKeepAwake,
  onCancel,
  loading = false,
  disabled = false,
  now,
}: {
  keepAwakeUntil: Nullable<string>
  maxDeferralSeconds: number
  onKeepAwake: (until: Date) => void
  onCancel: () => void
  loading?: boolean
  disabled?: boolean
  now: Date
}) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState<Nullable<string>>(null)
  const kept = isKeptAwake({ keepAwakeUntil: currentUntil }, now)
  const ceiling = dayjs(now).add(maxDeferralSeconds, 'second')

  const presets = KEEP_AWAKE_PRESETS.map((preset) => {
    const until = keepAwakeUntil({
      minutes: preset.minutes,
      from: currentUntil,
      maxDeferralSeconds,
      now,
    })
    return { ...preset, until, capped: !dayjs(until).isBefore(ceiling) }
  })

  const onSelect = (key: string) => {
    setOpen(false)
    if (key === SLEEP) return onCancel()
    if (key === CUSTOM)
      return setCustom(
        dayjs(kept && currentUntil ? currentUntil : now)
          .add(2, 'hour')
          .format(DATETIME_LOCAL)
      )
    const preset = presets.find((p) => p.key === key)
    if (preset) onKeepAwake(preset.until)
  }

  const items = [
    ...presets.map((p) => (
      <ListBoxItem
        key={p.key}
        label={p.label}
        description={`until ${dayjs(p.until).format('h:mm A')}${p.capped ? ' (max)' : ''}`}
      />
    )),
    <ListBoxItem
      key={CUSTOM}
      label="Custom…"
    />,
    ...(kept
      ? [
          <ListBoxItem
            key={SLEEP}
            label="Let it sleep when idle"
            destructive
          />,
        ]
      : []),
  ]

  return (
    <>
      <Select
        label="Keep awake"
        isOpen={open}
        onOpenChange={setOpen}
        isDisabled={disabled}
        placement="right"
        width={260}
        selectedKey={null}
        onSelectionChange={(key) => onSelect(`${key}`)}
        dropdownHeaderFixed={
          <HeaderSC>
            {kept
              ? `Until ${dayjs(currentUntil).format('h:mm A')}; extend by`
              : 'Keep this instance awake for'}
          </HeaderSC>
        }
        triggerButton={
          <Button
            small
            secondary
            startIcon={<ClockIcon />}
            endIcon={<DropdownArrowIcon />}
            loading={loading}
            disabled={disabled}
          >
            {kept ? 'Kept awake' : 'Keep awake'}
          </Button>
        }
      >
        {items}
      </Select>
      <CustomKeepAwakeModal
        value={custom}
        onChange={setCustom}
        onClose={() => setCustom(null)}
        onSubmit={(until) => {
          onKeepAwake(until)
          setCustom(null)
        }}
        min={dayjs(now).format(DATETIME_LOCAL)}
        max={ceiling.format(DATETIME_LOCAL)}
        maxDeferralSeconds={maxDeferralSeconds}
        now={now}
      />
    </>
  )
}

function CustomKeepAwakeModal({
  value,
  onChange,
  onClose,
  onSubmit,
  min,
  max,
  maxDeferralSeconds,
  now,
}: {
  value: Nullable<string>
  onChange: (value: string) => void
  onClose: () => void
  onSubmit: (until: Date) => void
  min: string
  max: string
  maxDeferralSeconds: number
  now: Date
}) {
  const result = value
    ? clampCustomKeepAwake(dayjs(value).toDate(), maxDeferralSeconds, now)
    : null
  return (
    <Modal
      open={value !== null}
      onClose={onClose}
      header="Keep awake until"
      size="medium"
      actions={
        <Flex gap="small">
          <Button
            secondary
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            disabled={!result || !!result.error}
            onClick={() => result && onSubmit(result.until)}
          >
            Keep awake
          </Button>
        </Flex>
      }
    >
      <FormField
        hint={
          result?.error ??
          (result?.clamped
            ? `Capped at ${dayjs(result.until).format('MMM D, h:mm A')}, the most this box allows`
            : undefined)
        }
        error={!!result?.error}
      >
        <Input
          type="datetime-local"
          value={value ?? ''}
          inputProps={{ min, max, 'aria-label': 'Keep awake until' }}
          onChange={(e) => onChange(e.currentTarget.value)}
        />
      </FormField>
    </Modal>
  )
}

const HeaderSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  padding: `${theme.spacing.small} ${theme.spacing.medium} ${theme.spacing.xsmall}`,
}))
