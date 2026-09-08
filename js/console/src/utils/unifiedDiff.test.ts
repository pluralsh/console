import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getOldContentFromUnifiedDiff } from './unifiedDiff'

// A unified diff that turns "old" content into "new" content.
// Used by tests below to verify the patch is correctly reversed.
const OLD_TEXT = ['line one', 'line two', 'line three', ''].join('\n')
const NEW_TEXT = ['line one', 'line TWO', 'line three', ''].join('\n')
const PATCH = [
  '--- a/file.txt',
  '+++ b/file.txt',
  '@@ -1,3 +1,3 @@',
  ' line one',
  '-line two',
  '+line TWO',
  ' line three',
  '',
].join('\n')

describe('getOldContentFromUnifiedDiff', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('returns newContent unchanged when patch is null/undefined/empty', () => {
    expect(getOldContentFromUnifiedDiff('hello', null)).toEqual({
      numChanges: 0,
      oldContent: 'hello',
    })
    expect(getOldContentFromUnifiedDiff('hello', undefined)).toEqual({
      numChanges: 0,
      oldContent: 'hello',
    })
    expect(getOldContentFromUnifiedDiff('hello', '')).toEqual({
      numChanges: 0,
      oldContent: 'hello',
    })
  })

  it('returns empty oldContent when newContent is null and patch is missing', () => {
    expect(getOldContentFromUnifiedDiff(null, null)).toEqual({
      numChanges: 0,
      oldContent: '',
    })
  })

  it('reverses a valid patch to recover the old content', () => {
    const result = getOldContentFromUnifiedDiff(NEW_TEXT, PATCH)
    expect(result.oldContent).toBe(OLD_TEXT)
    expect(result.numChanges).toBe(1)
  })

  it('counts numChanges as the number of hunks in the patch', () => {
    const oldMulti = Array.from({ length: 11 }, (_, i) => `line ${i}`).join(
      '\n'
    )
    const newMulti = oldMulti
      .replace('line 1', 'line ONE')
      .replace('line 9', 'line NINE')
    const multiHunkPatch = [
      '--- a/multi.txt',
      '+++ b/multi.txt',
      '@@ -1,3 +1,3 @@',
      ' line 0',
      '-line 1',
      '+line ONE',
      ' line 2',
      '@@ -8,3 +8,3 @@',
      ' line 8',
      '-line 9',
      '+line NINE',
      ' line 10',
      '',
    ].join('\n')

    const result = getOldContentFromUnifiedDiff(newMulti, multiHunkPatch)
    expect(result.numChanges).toBe(2)
    expect(result.oldContent).toBe(oldMulti)
  })

  // Regression test for the diff v8 API change: applyPatch now returns
  // `string | false` instead of throwing/returning string. When the patch's
  // context lines don't match the input, applyPatch returns `false` rather
  // than throwing, so the wrapper must explicitly fall back to newContent.
  it('falls back to newContent when applyPatch fails (returns false in diff v8+)', () => {
    const mismatched = ['totally', 'different', 'content', ''].join('\n')
    const result = getOldContentFromUnifiedDiff(mismatched, PATCH)
    expect(result.oldContent).toBe(mismatched)
    // hunks length is still parsed even if application fails
    expect(result.numChanges).toBe(1)
  })

  it('returns 0 changes and newContent when patch is unparseable', () => {
    const result = getOldContentFromUnifiedDiff('keep me', 'not a real patch')
    expect(result).toEqual({ numChanges: 0, oldContent: 'keep me' })
  })

  // Regression test for the diff v8 API change: parsePatch returns an array
  // of StructuredPatch (one per file in a multi-file diff), but applyPatch
  // and reversePatch now require a SINGLE StructuredPatch (or 1-tuple) — they
  // no longer accept the full array as v7 did. The wrapper must take the
  // first patch.
  it('handles a multi-file unified diff by reversing the first file patch', () => {
    const multiFilePatch = [
      '--- a/first.txt',
      '+++ b/first.txt',
      '@@ -1,1 +1,1 @@',
      '-old first',
      '+new first',
      '--- a/second.txt',
      '+++ b/second.txt',
      '@@ -1,1 +1,1 @@',
      '-old second',
      '+new second',
      '',
    ].join('\n')

    const result = getOldContentFromUnifiedDiff('new first\n', multiFilePatch)
    expect(result.oldContent).toBe('old first\n')
    expect(result.numChanges).toBe(1)
  })
})
