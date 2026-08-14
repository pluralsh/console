import { describe, expect, it } from 'vitest'
import { combineExecChunks } from './workbenchJobExecUtils'

describe('combineExecChunks', () => {
  it('renders stdout in sequence order and ignores duplicate deliveries', () => {
    const chunks = {
      2: 'third\n',
      0: 'first\n',
      1: 'second\n',
    }

    expect(combineExecChunks(chunks)).toBe('first\nsecond\nthird\n')
  })
})
