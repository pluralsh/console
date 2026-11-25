import {
  Button,
  ListBoxItem,
  Select,
  styledThemeDark,
} from '@pluralsh/design-system'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import dayjs from 'dayjs'
import { useState } from 'react'
import { ThemeProvider } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import { useKeepAwakeActions } from './DevboxKeepAwakeMenu'
import { clampCustomKeepAwake, keepAwakeUntil } from './devboxIdle'

const NOW = new Date('2026-11-14T10:00:00')
const HOUR = 60 * 60

function KeepAwakeMenu(props: Parameters<typeof useKeepAwakeActions>[0]) {
  const { items, onSelect, modal } = useKeepAwakeActions(props)
  const [open, setOpen] = useState(false)
  return (
    <>
      <Select
        label="Instance actions"
        isOpen={open}
        onOpenChange={setOpen}
        selectedKey={null}
        onSelectionChange={(key) => {
          setOpen(false)
          onSelect(`${key}`)
        }}
        triggerButton={<Button>Instance actions</Button>}
      >
        {items.map((i) => (
          <ListBoxItem
            key={i.key}
            label={i.label}
            description={i.description}
            destructive={i.destructive}
          />
        ))}
      </Select>
      {modal}
    </>
  )
}

function renderMenu(
  keepAwake: Nullable<string>,
  maxDeferralSeconds = 4 * HOUR
) {
  const onKeepAwake = vi.fn()
  const onCancel = vi.fn()
  render(
    <ThemeProvider theme={styledThemeDark}>
      <KeepAwakeMenu
        keepAwakeUntil={keepAwake}
        maxDeferralSeconds={maxDeferralSeconds}
        onKeepAwake={onKeepAwake}
        onCancel={onCancel}
        now={NOW}
      />
    </ThemeProvider>
  )
  return { onKeepAwake, onCancel }
}

const items = () => screen.getAllByRole('option')
const openMenu = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Instance actions' }))

describe('useKeepAwakeActions', () => {
  it('offers presets capped at the max deferral', async () => {
    const { onKeepAwake } = renderMenu(null)
    openMenu()
    expect(items().map((i) => i.textContent)).toEqual([
      'Keep awake for 30 minutesuntil 10:30 AM',
      'Keep awake for 1 houruntil 11:00 AM',
      'Keep awake for 4 hoursuntil 2:00 PM (max)',
      'Keep awake for 12 hoursuntil 2:00 PM (max)',
      'Keep awake until…',
    ])
    fireEvent.click(items()[1])
    expect(onKeepAwake).toHaveBeenCalledWith(new Date('2026-11-14T11:00:00'))
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
  })

  it('extends from the current deferral and can cancel it', async () => {
    const { onKeepAwake, onCancel } = renderMenu('2026-11-14T11:00:00')
    openMenu()
    fireEvent.click(
      screen.getByRole('option', { name: /Extend by 30 minutes/ })
    )
    expect(onKeepAwake).toHaveBeenCalledWith(new Date('2026-11-14T11:30:00'))

    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
    openMenu()
    fireEvent.click(
      screen.getByRole('option', { name: 'Let it sleep when idle' })
    )
    expect(onCancel).toHaveBeenCalled()
  })

  it('clamps a custom time and rejects past times', () => {
    const { onKeepAwake } = renderMenu(null)
    openMenu()
    fireEvent.click(screen.getByRole('option', { name: 'Keep awake until…' }))
    const dialog = screen.getByRole('dialog')
    const input = within(dialog).getByLabelText('Keep awake until')

    fireEvent.change(input, { target: { value: '2026-11-14T09:00' } })
    expect(screen.getByText('Pick a time in the future')).toBeTruthy()

    fireEvent.change(input, { target: { value: '2026-11-14T20:00' } })
    expect(screen.getByText(/Capped at Nov 14, 2:00 PM/)).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep awake' }))
    expect(onKeepAwake).toHaveBeenCalledWith(new Date('2026-11-14T14:00:00'))
  })
})

describe('keep-awake helpers', () => {
  it('extends from a future deferral but never past the ceiling', () => {
    expect(
      keepAwakeUntil({
        minutes: 60,
        from: dayjs(NOW).add(1, 'hour').toDate(),
        maxDeferralSeconds: 12 * HOUR,
        now: NOW,
      })
    ).toEqual(dayjs(NOW).add(2, 'hour').toDate())
    expect(
      keepAwakeUntil({ minutes: 600, maxDeferralSeconds: HOUR, now: NOW })
    ).toEqual(dayjs(NOW).add(1, 'hour').toDate())
    expect(
      clampCustomKeepAwake(dayjs(NOW).add(30, 'minute').toDate(), HOUR, NOW)
    ).toEqual({ until: dayjs(NOW).add(30, 'minute').toDate(), clamped: false })
  })
})
