import {
  Button,
  ClockIcon,
  Flex,
  FormField,
  ICON_FRAME_ICON_SIZE,
  Input,
  Modal,
  MoonIcon,
} from '@pluralsh/design-system'
import dayjs from 'dayjs'
import { ReactNode, useState } from 'react'
import {
  clampCustomKeepAwake,
  isKeptAwake,
  KEEP_AWAKE_PRESETS,
  keepAwakeUntil,
} from './devboxIdle'

const DATETIME_LOCAL = 'YYYY-MM-DDTHH:mm'
const CUSTOM = 'custom'
const SLEEP = 'sleep'

export const KEEP_AWAKE_KEY_PREFIX = 'awake:'

export type KeepAwakeItem = {
  key: string
  label: string
  description?: string
  icon: ReactNode
  destructive?: boolean
}

// keep-awake entries for a menu, with their select handler and the custom-time modal to render
export function useKeepAwakeActions({
  keepAwakeUntil: currentUntil,
  maxDeferralSeconds,
  onKeepAwake,
  onCancel,
  now,
}: {
  keepAwakeUntil: Nullable<string>
  maxDeferralSeconds: number
  onKeepAwake: (until: Date) => void
  onCancel: () => void
  now: Date
}) {
  const [custom, setCustom] = useState<Nullable<string>>(null)
  const kept = isKeptAwake({ keepAwakeUntil: currentUntil }, now)
  const ceiling = dayjs(now).add(maxDeferralSeconds, 'second')
  const clock = <ClockIcon size={ICON_FRAME_ICON_SIZE.small} />

  const presets = KEEP_AWAKE_PRESETS.map((preset) => {
    const until = keepAwakeUntil({
      minutes: preset.minutes,
      from: currentUntil,
      maxDeferralSeconds,
      now,
    })
    return { ...preset, until, capped: !dayjs(until).isBefore(ceiling) }
  })

  const items: KeepAwakeItem[] = [
    ...presets.map((p) => ({
      key: `${KEEP_AWAKE_KEY_PREFIX}${p.key}`,
      label: `${kept ? 'Extend by' : 'Keep awake for'} ${p.label}`,
      description: `until ${dayjs(p.until).format('h:mm A')}${p.capped ? ' (max)' : ''}`,
      icon: clock,
    })),
    {
      key: `${KEEP_AWAKE_KEY_PREFIX}${CUSTOM}`,
      label: 'Keep awake until…',
      icon: clock,
    },
    ...(kept
      ? [
          {
            key: `${KEEP_AWAKE_KEY_PREFIX}${SLEEP}`,
            label: 'Let it sleep when idle',
            icon: <MoonIcon size={ICON_FRAME_ICON_SIZE.small} />,
            destructive: true,
          },
        ]
      : []),
  ]

  // whether the key was a keep-awake entry
  const onSelect = (selected: string) => {
    if (!selected.startsWith(KEEP_AWAKE_KEY_PREFIX)) return false
    const key = selected.slice(KEEP_AWAKE_KEY_PREFIX.length)
    if (key === SLEEP) onCancel()
    else if (key === CUSTOM)
      setCustom(
        dayjs(kept && currentUntil ? currentUntil : now)
          .add(2, 'hour')
          .format(DATETIME_LOCAL)
      )
    else {
      const preset = presets.find((p) => p.key === key)
      if (preset) onKeepAwake(preset.until)
    }
    return true
  }

  const modal = (
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
  )

  return { items, onSelect, modal }
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
