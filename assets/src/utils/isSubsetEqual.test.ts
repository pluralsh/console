import { expect } from 'vitest'
import { isSubsetEqual } from './isSubsetEqual'

const set: Record<string, any> = {
  a: 'a string',
  b: false,
  c: 123.3,
  d: {
    a: true,
    b: 2,
    c: 'another string',
    d: false,
  },
}

describe('Email utils', () => {
  it('should detect valid email addresses', () => {
    expect(isSubsetEqual({}, {})).toBeTruthy()
    expect(isSubsetEqual(set, {})).toBeTruthy()
    expect(isSubsetEqual(set, set)).toBeTruthy()
    expect(isSubsetEqual(set, { a: 'a string' })).toBeTruthy()
    expect(isSubsetEqual(set, { a: 'a different string' })).toBeFalsy()
    expect(isSubsetEqual(set, { b: false })).toBeTruthy()
    expect(isSubsetEqual(set, { b: true })).toBeFalsy()
    expect(isSubsetEqual({}, set)).toBeFalsy()
    expect(isSubsetEqual(set, { d: { a: true } })).toBeFalsy()
    expect(
      isSubsetEqual(set, {
        d: { a: true, b: 2, c: 'another string', d: false },
      })
    ).toBeTruthy()
  })
})
