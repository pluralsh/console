import { expect } from 'vitest'
import { generateRandomAlphanumeric } from './generateRandomAlphanumeric'

describe('generateRandomAlphanumeric', () => {
  it('generates a string of the requested length', () => {
    expect(generateRandomAlphanumeric(32)).toHaveLength(32)
    expect(generateRandomAlphanumeric(16)).toHaveLength(16)
  })

  it('uses only alphanumeric characters', () => {
    expect(generateRandomAlphanumeric(128)).toMatch(/^[A-Za-z0-9]+$/)
  })
})
