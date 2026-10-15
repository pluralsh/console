import { CaretDownIcon, PauseIcon, PlayIcon } from '@pluralsh/design-system'
import { useRef, useState, type KeyboardEvent } from 'react'
import styled from 'styled-components'
import {
  TIME_RANGE_PRESETS,
  type TimeRange,
  type TimeRangePreset,
  formatDurationShort,
  formatRangeText,
  parseRangeText,
  rangeDurationMs,
  rangeWindow,
  startOfCurrentMinute,
} from './timeRange'

type EditState = { draft: string; initial: string; highlighted: number }

/**
 * Editable time range field (type `4h` or an explicit `start – end`) with a
 * preset menu and a live/paused toggle (hidden with `showLiveToggle={false}`).
 */
export function TimeRangeControl({
  value,
  now,
  onChange,
  presets = TIME_RANGE_PRESETS,
  showLiveToggle = true,
  width = 340,
  className,
}: {
  value: TimeRange
  now: Date
  onChange: (range: TimeRange) => void
  presets?: TimeRangePreset[]
  showLiveToggle?: boolean
  width?: number | string
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const closingRef = useRef(false)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [error, setError] = useState(false)
  const durationMs = rangeDurationMs(value)
  const editing = edit !== null

  const startEditing = () => {
    const initial = formatRangeText(
      { live: false, ...rangeWindow(value, now) },
      now
    )
    setEdit({ draft: initial, initial, highlighted: -1 })
    setError(false)
    requestAnimationFrame(() => inputRef.current?.select())
  }

  const stopEditing = () => {
    setEdit(null)
    setError(false)
    closingRef.current = true
    inputRef.current?.blur()
    closingRef.current = false
  }

  const apply = (next: TimeRange) => {
    onChange(next)
    stopEditing()
  }

  const commitDraft = (revertOnError: boolean) => {
    if (!edit) return
    if (edit.draft.trim() === edit.initial) return stopEditing()
    const parsed = parseRangeText(edit.draft, startOfCurrentMinute())
    if (parsed) return apply(parsed)
    if (revertOnError) return stopEditing()
    setError(true)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!edit) return
    const count = presets.length
    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        stopEditing()
        break
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault()
        const delta = e.key === 'ArrowDown' ? 1 : -1
        const highlighted = (edit.highlighted + delta + count) % count
        setEdit({ ...edit, highlighted })
        break
      }
      case 'Enter': {
        e.preventDefault()
        const preset = presets[edit.highlighted]
        if (preset) apply({ live: true, durationMs: preset.durationMs })
        else commitDraft(false)
        break
      }
    }
  }

  const toggleLive = () => {
    if (value.live) onChange({ live: false, ...rangeWindow(value, now) })
    else onChange({ live: true, durationMs })
  }

  return (
    <ControlSC className={className}>
      <FieldSC
        $editing={editing}
        $error={error}
        style={{ width }}
        onMouseDown={(e) => {
          if (e.target === inputRef.current) return
          e.preventDefault()
          inputRef.current?.focus()
        }}
      >
        <DurationChipSC>{formatDurationShort(durationMs)}</DurationChipSC>
        <InputSC
          ref={inputRef}
          aria-label="Time range"
          aria-invalid={error}
          spellCheck={false}
          value={edit ? edit.draft : formatRangeText(value, now)}
          onFocus={() => !editing && startEditing()}
          onBlur={() => !closingRef.current && commitDraft(true)}
          onChange={(e) => {
            setError(false)
            setEdit((current) =>
              current
                ? { ...current, draft: e.target.value, highlighted: -1 }
                : current
            )
          }}
          onKeyDown={onKeyDown}
        />
        <CaretDownIcon
          size={12}
          color="icon-xlight"
        />
        {editing && (
          <MenuSC
            role="listbox"
            onMouseDown={(e) => e.preventDefault()}
          >
            <MenuHintSC>
              {error
                ? 'Couldn’t parse that range. Try “4h” or “Oct 3, 9:00 am – 1:00 pm”.'
                : 'Type a duration like “4h” or edit the range above'}
            </MenuHintSC>
            {presets.map((preset, i) => (
              <MenuItemSC
                key={preset.durationMs}
                role="option"
                aria-selected={
                  value.live && value.durationMs === preset.durationMs
                }
                $highlighted={i === edit.highlighted}
                onMouseEnter={() =>
                  setEdit((current) =>
                    current ? { ...current, highlighted: i } : current
                  )
                }
                onClick={() =>
                  apply({ live: true, durationMs: preset.durationMs })
                }
              >
                <DurationChipSC>
                  {formatDurationShort(preset.durationMs)}
                </DurationChipSC>
                {preset.label}
              </MenuItemSC>
            ))}
          </MenuSC>
        )}
      </FieldSC>
      {showLiveToggle && (
        <LiveButtonSC
          type="button"
          $live={value.live}
          aria-pressed={value.live}
          title={value.live ? 'Pause live updates' : 'Resume live updates'}
          onClick={toggleLive}
        >
          {value.live ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
          {value.live ? 'Live' : 'Paused'}
        </LiveButtonSC>
      )}
    </ControlSC>
  )
}

const ControlSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flexShrink: 0,
  gap: theme.spacing.xsmall,
  minWidth: 0,
}))

const FieldSC = styled.div<{ $editing: boolean; $error: boolean }>(
  ({ theme, $editing, $error }) => ({
    alignItems: 'center',
    backgroundColor: theme.colors['fill-one'],
    border: `1px solid ${
      $error
        ? theme.colors['border-danger']
        : $editing
          ? theme.colors['border-outline-focused']
          : theme.colors['border-input']
    }`,
    borderRadius: theme.borderRadiuses.medium,
    cursor: 'text',
    display: 'flex',
    gap: theme.spacing.xsmall,
    height: 32,
    minWidth: 0,
    padding: `0 ${theme.spacing.small}px 0 ${theme.spacing.xsmall}px`,
    position: 'relative',
  })
)

const InputSC = styled.input(({ theme }) => ({
  ...theme.partials.text.body2,
  background: 'none',
  border: 'none',
  color: theme.colors.text,
  flex: 1,
  minWidth: 0,
  outline: 'none',
  padding: 0,
}))

const DurationChipSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  backgroundColor: theme.colors['fill-three'],
  borderRadius: theme.borderRadiuses.medium,
  color: theme.colors['text-light'],
  flexShrink: 0,
  minWidth: 36,
  padding: '1px 6px',
  textAlign: 'center',
}))

const MenuSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-two'],
  border: theme.borders['fill-two'],
  borderRadius: theme.borderRadiuses.large,
  boxShadow: theme.boxShadows.moderate,
  display: 'flex',
  flexDirection: 'column',
  left: -1,
  minWidth: 280,
  padding: `${theme.spacing.xsmall}px 0`,
  position: 'absolute',
  right: -1,
  top: 'calc(100% + 4px)',
  zIndex: theme.zIndexes.selectPopover,
}))

const MenuHintSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.medium}px ${theme.spacing.xsmall}px`,
}))

const MenuItemSC = styled.div<{ $highlighted: boolean }>(
  ({ theme, $highlighted }) => ({
    ...theme.partials.text.body2,
    alignItems: 'center',
    backgroundColor: $highlighted
      ? theme.colors['fill-two-hover']
      : 'transparent',
    color: theme.colors.text,
    cursor: 'pointer',
    display: 'flex',
    gap: theme.spacing.small,
    padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
    '&[aria-selected="true"]': {
      color: theme.colors['text-primary-accent'],
    },
  })
)

const LiveButtonSC = styled.button<{ $live: boolean }>(({ theme, $live }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.buttonSmall,
  alignItems: 'center',
  backgroundColor: theme.colors['fill-one'],
  border: `1px solid ${theme.colors['border-input']}`,
  borderRadius: theme.borderRadiuses.medium,
  color: $live ? theme.colors['text-success'] : theme.colors['text-light'],
  cursor: 'pointer',
  display: 'flex',
  flexShrink: 0,
  gap: theme.spacing.xsmall,
  height: 32,
  padding: `0 ${theme.spacing.small}px`,
  '&:hover': {
    backgroundColor: theme.colors['fill-one-hover'],
  },
  '&:focus-visible': {
    outline: `1px solid ${theme.colors['border-outline-focused']}`,
  },
}))
