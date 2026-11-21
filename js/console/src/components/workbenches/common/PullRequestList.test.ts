import { PrStatus } from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import { sortOpenFirst } from './PullRequestList'

describe('sortOpenFirst', () => {
  it('moves open pull requests ahead and keeps the order otherwise', () => {
    const prs = [
      { id: '1', status: PrStatus.Merged },
      { id: '2', status: PrStatus.Open },
      { id: '3', status: PrStatus.Closed },
      { id: '4', status: PrStatus.Open },
    ]
    expect(sortOpenFirst(prs).map((pr) => pr.id)).toEqual(['2', '4', '1', '3'])
  })
})
