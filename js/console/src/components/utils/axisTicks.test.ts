import { describe, expect, it } from 'vitest'
import { niceAxis } from './axisTicks'

const MI = 1024 ** 2
const GI = 1024 ** 3

describe('niceAxis', () => {
  it('uses 1/2/2.5/5 steps and snaps the max to a whole step', () => {
    expect(niceAxis(0, 0.00123)).toEqual({
      min: 0,
      max: 0.00125,
      step: 0.00025,
      ticks: [0, 0.00025, 0.0005, 0.00075, 0.001, 0.00125],
    })
    expect(niceAxis(3, 87).ticks).toEqual([0, 20, 40, 60, 80, 100])
  })

  it('never produces more than count + 1 ticks', () => {
    for (const max of [0.7, 1.3, 9.9, 42, 777, 12345, 0.00042]) {
      const { ticks } = niceAxis(0, max)
      expect(ticks.length).toBeLessThanOrEqual(6)
      expect(ticks.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('aligns byte axes to binary units', () => {
    expect(niceAxis(0, 105 * MI, { base: 'binary' }).ticks).toEqual(
      [0, 25, 50, 75, 100, 125].map((n) => n * MI)
    )
    expect(niceAxis(0, 1.2 * GI, { base: 'binary' }).ticks).toEqual(
      [0, 0.25, 0.5, 0.75, 1, 1.25].map((n) => n * GI)
    )
  })

  it('aligns millisecond durations to clock steps', () => {
    expect(niceAxis(0, 400_000, { base: 'duration' }).ticks).toEqual(
      [0, 120, 240, 360, 480].map((s) => s * 1000)
    )
    expect(niceAxis(0, 350, { base: 'duration' }).step).toBe(100)
  })

  it('aligns durations in other units via msPerUnit', () => {
    const seconds = { base: 'duration', msPerUnit: 1000 } as const
    expect(niceAxis(0, 400, seconds).ticks).toEqual([0, 120, 240, 360, 480])
    expect(niceAxis(0, 0.35, seconds).step).toBe(0.1)
  })

  it('keeps count axes on whole numbers', () => {
    expect(niceAxis(0, 1, { base: 'integer' }).ticks).toEqual([0, 1])
    expect(niceAxis(0, 3, { base: 'integer' }).ticks).toEqual([0, 1, 2, 3])
    expect(niceAxis(0, 12, { base: 'integer' }).ticks).toEqual([0, 5, 10, 15])
    for (const max of [2, 7, 11, 23, 140]) {
      const { ticks } = niceAxis(0, max, { base: 'integer' })
      expect(ticks.every(Number.isInteger)).toBe(true)
    }
  })

  it('handles flat, empty and negative series', () => {
    expect(niceAxis(0, 0).ticks).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1])
    expect(niceAxis(Infinity, -Infinity).ticks).toEqual([
      0, 0.2, 0.4, 0.6, 0.8, 1,
    ])
    expect(niceAxis(-40, 60).ticks).toEqual([-40, -20, 0, 20, 40, 60])
    expect(niceAxis(50, 50, { includeZero: false }).ticks).toEqual([
      20, 40, 60, 80,
    ])
    expect(niceAxis(13, 97, { includeZero: false }).ticks.length).toBeLessThan(
      7
    )
  })
})
