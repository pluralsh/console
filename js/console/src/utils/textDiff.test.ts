import { expect } from 'vitest'
import { getOldContentFromTextDiff } from './textDiff'

describe('getOldContentFromTextDiff', () => {
  it('should return newContent when textDiff is null or undefined', () => {
    expect(getOldContentFromTextDiff('new content', null)).toBe('new content')
    expect(getOldContentFromTextDiff('new content', undefined)).toBe(
      'new content'
    )
  })

  it('should extract old content from a simple TextDiff', () => {
    // Simulated TextDiff output for:
    //   old: "Hello world\nThis is old\nUnchanged"
    //   new: "Hello world\nThis is new\nUnchanged"
    const textDiff = [
      '1  1   |Hello world',
      '2    - |This is old',
      '   2 + |This is new',
      '3  3   |Unchanged',
    ].join('\n')

    expect(getOldContentFromTextDiff('ignored', textDiff)).toBe(
      'Hello world\nThis is old\nUnchanged'
    )
  })

  it('should handle additions with no corresponding deletion', () => {
    const textDiff = [
      '1  1   |Line one',
      '   2 + |Added line',
      '2  3   |Line two',
    ].join('\n')

    expect(getOldContentFromTextDiff('ignored', textDiff)).toBe(
      'Line one\nLine two'
    )
  })

  it('should handle deletions with no corresponding addition', () => {
    const textDiff = [
      '1  1   |Line one',
      '2    - |Removed line',
      '3  2   |Line two',
    ].join('\n')

    expect(getOldContentFromTextDiff('ignored', textDiff)).toBe(
      'Line one\nRemoved line\nLine two'
    )
  })

  it('should strip ANSI escape codes before parsing', () => {
    const textDiff = [
      '\x1b[0m1  1   |Hello world\x1b[0m',
      '\x1b[31m2    - |Old line\x1b[0m',
      '\x1b[32m   2 + |New line\x1b[0m',
    ].join('\n')

    expect(getOldContentFromTextDiff('ignored', textDiff)).toBe(
      'Hello world\nOld line'
    )
  })

  it('should preserve content containing pipe characters', () => {
    const textDiff = [
      '1  1   |value = a | b',
      '2    - |old | value',
      '   2 + |new | value',
    ].join('\n')

    expect(getOldContentFromTextDiff('ignored', textDiff)).toBe(
      'value = a | b\nold | value'
    )
  })

  it('should return newContent on empty diff string', () => {
    expect(getOldContentFromTextDiff('fallback', '')).toBe('fallback')
  })
})
