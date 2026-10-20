import { describe, expect, it } from 'vitest'
import { AXIS_CHAR_PX, niceTimeTicks } from './timeTicks'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const localMs = (d: Date) => d.getTime() - d.getTimezoneOffset() * MINUTE

function window(durationMs: number) {
  const end = new Date(2026, 9, 3, 19, 17, 23)
  return { start: new Date(end.getTime() - durationMs), end }
}

describe('niceTimeTicks', () => {
  it('uses clock-aligned 10m steps for an hour on a ~450px plot', () => {
    const { start, end } = window(HOUR)
    const { step, ticks, format } = niceTimeTicks(start, end, 450)

    expect(step).toBe(10 * MINUTE)
    expect(format).toBe('%H:%M')
    ticks.forEach((t) => expect(localMs(t) % step).toBe(0))
  })

  it('never lets neighbouring labels overlap', () => {
    for (const duration of [
      15 * MINUTE,
      HOUR,
      4 * HOUR,
      DAY,
      3 * DAY,
      30 * DAY,
    ])
      for (const width of [180, 320, 640, 1200]) {
        const { start, end } = window(duration)
        const { ticks, labelChars } = niceTimeTicks(start, end, width)
        const px = (t: Date) =>
          ((t.getTime() - start.getTime()) / duration) * width

        for (let i = 1; i < ticks.length; i++)
          expect(px(ticks[i]) - px(ticks[i - 1])).toBeGreaterThanOrEqual(
            labelChars * AXIS_CHAR_PX
          )
      }
  })

  it('widens the step as the plot narrows', () => {
    const { start, end } = window(HOUR)
    const wide = niceTimeTicks(start, end, 1200)
    const narrow = niceTimeTicks(start, end, 200)

    expect(narrow.step).toBeGreaterThan(wide.step)
    expect(narrow.ticks.length).toBeLessThan(wide.ticks.length)
  })

  it('switches label formats with the span and step', () => {
    expect(niceTimeTicks(...range(2 * MINUTE), 600).format).toBe('%H:%M:%S')
    expect(niceTimeTicks(...range(2 * DAY), 600).format).toBe('%b %d %H:%M')
    expect(niceTimeTicks(...range(30 * DAY), 600).format).toBe('%b %d')
  })

  it('drops edge ticks whose labels would overflow the plot', () => {
    const start = new Date(2026, 9, 3, 18, 0, 0)
    const end = new Date(2026, 9, 3, 19, 0, 0)
    const { ticks } = niceTimeTicks(start, end, 450)

    expect(ticks[0].getTime()).toBeGreaterThan(start.getTime())
    expect(ticks[ticks.length - 1].getTime()).toBeLessThan(end.getTime())

    const withOverhang = niceTimeTicks(start, end, 450, {
      overhangPx: { left: 50, right: 20 },
    })
    expect(withOverhang.ticks[0].getTime()).toBe(start.getTime())
  })
})

function range(durationMs: number): [Date, Date] {
  const { start, end } = window(durationMs)
  return [start, end]
}
