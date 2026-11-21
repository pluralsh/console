import { DevboxInstanceStatus } from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import { getDevboxAwakeStatus } from './devboxIdle'

const now = new Date('2026-11-20T12:00:00Z')
const at = (seconds: number) =>
  new Date(now.getTime() + seconds * 1000).toISOString()

describe('getDevboxAwakeStatus', () => {
  it('warns when an idle instance suspends within a minute', () => {
    const status = getDevboxAwakeStatus(
      {
        status: DevboxInstanceStatus.Running,
        idleState: { idle: true, suspendsAt: at(30) },
      },
      { now }
    )
    expect(status.suspendingSoon).toBe(true)
    expect(status.label).toBe('Idle · suspends in 30s')
  })

  it('ignores a deadline left over from before the instance was woken', () => {
    const status = getDevboxAwakeStatus(
      {
        status: DevboxInstanceStatus.Running,
        idleState: { idle: true, suspendsAt: at(-10 * 60) },
      },
      { now }
    )
    expect(status.suspendingSoon).toBe(false)
    expect(status.label).toBe('Awake')
  })

  it('ignores a just-passed deadline from the run before this one', () => {
    const status = getDevboxAwakeStatus(
      {
        status: DevboxInstanceStatus.Running,
        awakeSince: at(-5),
        idleState: { idle: true, suspendsAt: at(-20) },
      },
      { now }
    )
    expect(status.suspendingSoon).toBe(false)
    expect(status.label).toBe('Awake')
  })
})
