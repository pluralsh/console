import { describe, expect, it } from 'vitest'
import { getLogSearchMatchRanges, logMatchesSearch } from './logSearch'

describe('log search helpers', () => {
  it('matches punctuated search terms literally', () => {
    expect(
      logMatchesSearch('matching line Project--123', 'Project--123', 'OR')
    ).toBe(true)
    expect(
      logMatchesSearch('noisy line Project--456', 'Project--123', 'OR')
    ).toBe(false)
  })

  it('honors AND and OR operators for multi-term searches', () => {
    expect(logMatchesSearch('error timeout', 'error missing', 'OR')).toBe(true)
    expect(logMatchesSearch('error timeout', 'error missing', 'AND')).toBe(
      false
    )
  })

  it('returns exact ranges for highlighting', () => {
    expect(
      getLogSearchMatchRanges('Project--123 Project--456', 'Project--123')
    ).toEqual([{ start: 0, end: 12 }])
  })
})
