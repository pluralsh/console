import { DevboxPullRequestFragment, PrStatus } from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import {
  openPullRequests,
  openPullRequestsByThread,
  pullRequestsStatus,
} from './devboxPullRequests'

const pr = (
  id: string,
  status: PrStatus,
  threadId?: string
): DevboxPullRequestFragment =>
  ({
    id,
    url: `https://github.com/pluralsh/console/pull/${id}`,
    title: id,
    status,
    devboxThread: threadId ? { id: threadId } : null,
  }) as DevboxPullRequestFragment

describe('open pull requests', () => {
  const prs = [
    pr('1', PrStatus.Open, 't1'),
    pr('2', PrStatus.Merged, 't1'),
    pr('3', PrStatus.Open, 't1'),
    pr('4', PrStatus.Closed, 't2'),
    pr('5', PrStatus.Open),
  ]

  it('counts only open ones', () => {
    expect(openPullRequests(prs).map((p) => p.id)).toEqual(['1', '3', '5'])
  })

  it('summarizes as open while any is, then merged, then closed', () => {
    expect(pullRequestsStatus(prs)).toBe(PrStatus.Open)
    expect(
      pullRequestsStatus(prs.filter((p) => p.status !== PrStatus.Open))
    ).toBe(PrStatus.Merged)
    expect(pullRequestsStatus([pr('4', PrStatus.Closed)])).toBe(PrStatus.Closed)
    expect(pullRequestsStatus([])).toBeUndefined()
  })

  it('groups open ones by the thread that opened them', () => {
    const byThread = openPullRequestsByThread(prs)
    expect(byThread.get('t1')?.map((p) => p.id)).toEqual(['1', '3'])
    expect(byThread.has('t2')).toBe(false)
    expect(byThread.size).toBe(1)
  })
})
