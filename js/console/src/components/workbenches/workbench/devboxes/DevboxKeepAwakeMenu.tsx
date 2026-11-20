import {
  Button,
  Chip,
  ClockIcon,
  DropdownArrowIcon,
  Flex,
  MoonIcon,
} from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import dayjs from 'dayjs'
import { useEffect, useRef, useState } from 'react'
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
  const ref = useRef<HTMLDivElement>(null)
  const kept = isKeptAwake({ keepAwakeUntil: currentUntil }, now)
  const ceiling = dayjs(now).add(maxDeferralSeconds, 'second')

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const choose = (until: Date) => {
    onKeepAwake(until)
    setOpen(false)
    setCustom(null)
  }

  const customResult = custom
    ? clampCustomKeepAwake(dayjs(custom).toDate(), maxDeferralSeconds, now)
    : null

  return (
    <MenuWrapSC ref={ref}>
      <Button
        small
        secondary
        startIcon={<ClockIcon />}
        endIcon={<DropdownArrowIcon />}
        loading={loading}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {kept ? 'Kept awake' : 'Keep awake'}
      </Button>
      {open && (
        <MenuSC role="menu">
          <CaptionP
            $color="text-xlight"
            css={{ padding: '4px 12px' }}
          >
            {kept
              ? `Until ${dayjs(currentUntil).format('h:mm A')}; extend by`
              : 'Keep this instance awake for'}
          </CaptionP>
          {KEEP_AWAKE_PRESETS.map((preset) => {
            const until = keepAwakeUntil({
              minutes: preset.minutes,
              from: currentUntil,
              maxDeferralSeconds,
              now,
            })
            const capped = !dayjs(until).isBefore(ceiling)
            return (
              <MenuItemSC
                key={preset.key}
                role="menuitem"
                type="button"
                onClick={() => choose(until)}
              >
                <span>{preset.label}</span>
                <CaptionP $color="text-xlight">
                  until {dayjs(until).format('h:mm A')}
                  {capped ? ' (max)' : ''}
                </CaptionP>
              </MenuItemSC>
            )
          })}
          {custom === null ? (
            <MenuItemSC
              role="menuitem"
              type="button"
              onClick={() =>
                setCustom(
                  dayjs(currentUntil && kept ? currentUntil : now)
                    .add(2, 'hour')
                    .format(DATETIME_LOCAL)
                )
              }
            >
              Custom…
            </MenuItemSC>
          ) : (
            <Flex
              direction="column"
              gap="xsmall"
              padding="small"
            >
              <DateInputSC
                type="datetime-local"
                aria-label="Keep awake until"
                value={custom}
                min={dayjs(now).format(DATETIME_LOCAL)}
                max={ceiling.format(DATETIME_LOCAL)}
                onChange={(e) => setCustom(e.currentTarget.value)}
              />
              {customResult?.error ? (
                <CaptionP $color="text-danger">{customResult.error}</CaptionP>
              ) : customResult?.clamped ? (
                <CaptionP $color="text-warning">
                  Capped at {dayjs(customResult.until).format('MMM D, h:mm A')},
                  the most this box allows
                </CaptionP>
              ) : null}
              <Button
                small
                disabled={!customResult || !!customResult.error}
                onClick={() => customResult && choose(customResult.until)}
              >
                Keep awake
              </Button>
            </Flex>
          )}
          {kept && (
            <MenuItemSC
              role="menuitem"
              type="button"
              $danger
              onClick={() => {
                onCancel()
                setOpen(false)
              }}
            >
              Let it sleep when idle
            </MenuItemSC>
          )}
        </MenuSC>
      )}
    </MenuWrapSC>
  )
}

const MenuWrapSC = styled.div({ position: 'relative' })

const MenuSC = styled.div(({ theme }) => ({
  position: 'absolute',
  right: 0,
  top: 'calc(100% + 4px)',
  zIndex: theme.zIndexes.selectPopover,
  minWidth: 260,
  display: 'flex',
  flexDirection: 'column',
  padding: `${theme.spacing.xsmall}px 0`,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders['fill-two'],
  backgroundColor: theme.colors['fill-two'],
  boxShadow: theme.boxShadows.moderate,
}))

const MenuItemSC = styled.button<{ $danger?: boolean }>(
  ({ theme, $danger }) => ({
    ...theme.partials.text.body2,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.medium,
    padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    color: $danger ? theme.colors['text-danger-light'] : theme.colors.text,
    '&:hover': { backgroundColor: theme.colors['fill-two-hover'] },
  })
)

const DateInputSC = styled.input(({ theme }) => ({
  ...theme.partials.text.body2,
  padding: theme.spacing.xsmall,
  borderRadius: theme.borderRadiuses.medium,
  border: theme.borders.input,
  backgroundColor: theme.colors['fill-one'],
  color: theme.colors.text,
  colorScheme: 'dark',
}))
