import { styledThemeDark } from '@pluralsh/design-system'
import { fireEvent, render, screen } from '@testing-library/react'
import dayjs from 'dayjs'
import { ThemeProvider } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import { DevboxKeepAwakeMenu } from './DevboxKeepAwakeMenu'
import { clampCustomKeepAwake, keepAwakeUntil } from './devboxIdle'

const NOW = new Date('2026-11-14T10:00:00')
const HOUR = 60 * 60

function renderMenu(
  keepAwake: Nullable<string>,
  maxDeferralSeconds = 4 * HOUR
) {
  const onKeepAwake = vi.fn()
  const onCancel = vi.fn()
  render(
    <ThemeProvider theme={styledThemeDark}>
      <DevboxKeepAwakeMenu
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

const items = () => screen.getAllByRole('menuitem')

describe('DevboxKeepAwakeMenu', () => {
  it('offers presets capped at the max deferral', () => {
    const { onKeepAwake } = renderMenu(null)
    fireEvent.click(screen.getByRole('button', { name: /Keep awake/ }))
    expect(items().map((i) => i.textContent)).toEqual([
      '30 minutesuntil 10:30 AM',
      '1 houruntil 11:00 AM',
      '4 hoursuntil 2:00 PM (max)',
      '12 hoursuntil 2:00 PM (max)',
      'Custom…',
    ])
    fireEvent.click(items()[1])
    expect(onKeepAwake).toHaveBeenCalledWith(new Date('2026-11-14T11:00:00'))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('extends from the current deferral and can cancel it', () => {
    const { onKeepAwake, onCancel } = renderMenu('2026-11-14T11:00:00')
    fireEvent.click(screen.getByRole('button', { name: /Kept awake/ }))
    expect(screen.getByText('Until 11:00 AM; extend by')).toBeTruthy()
    fireEvent.click(screen.getByRole('menuitem', { name: /30 minutes/ }))
    expect(onKeepAwake).toHaveBeenCalledWith(new Date('2026-11-14T11:30:00'))

    fireEvent.click(screen.getByRole('button', { name: /Kept awake/ }))
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Let it sleep when idle' })
    )
    expect(onCancel).toHaveBeenCalled()
  })

  it('clamps a custom time and rejects past times', () => {
    const { onKeepAwake } = renderMenu(null)
    fireEvent.click(screen.getByRole('button', { name: /Keep awake/ }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Custom…' }))
    const input = screen.getByLabelText('Keep awake until')

    fireEvent.change(input, { target: { value: '2026-11-14T09:00' } })
    expect(screen.getByText('Pick a time in the future')).toBeTruthy()

    fireEvent.change(input, { target: { value: '2026-11-14T20:00' } })
    expect(screen.getByText(/Capped at Nov 14, 2:00 PM/)).toBeTruthy()
    const submit = screen
      .getAllByRole('button', { name: 'Keep awake' })
      .find((b) => !b.hasAttribute('aria-haspopup'))
    fireEvent.click(submit!)
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
