import { expect } from 'vitest'
import { ensureURLValidity, isValidURL, getURLPath } from './url'

describe('URL utils', () => {
  describe('isValidURL', () => {
    it('should detect valid URL paths', () => {
      expect(isValidURL('https://growthbook.plural.sh')).toBeTruthy()
      expect(isValidURL('//minecraft.plural.sh:25565')).toBeTruthy()
      expect(isValidURL('//www.plural.sh')).toBeTruthy()
      expect(
        isValidURL('https://example.com/path?query=value#fragment')
      ).toBeTruthy()
      expect(isValidURL('ftp://files.example.com:21')).toBeTruthy()
      expect(isValidURL('https://subdomain.example.co.uk')).toBeTruthy()

      expect(isValidURL('minecraft.plural.sh:25565')).toBeFalsy()
      expect(isValidURL('www.plural.sh')).toBeFalsy()
      expect(isValidURL('/test')).toBeFalsy()
      expect(isValidURL('/')).toBeFalsy()
      expect(isValidURL('')).toBeFalsy()
      expect(isValidURL('example')).toBeFalsy()
    })
  })

  describe('ensureURLValidity', () => {
    it('should handle null or empty values', () => {
      expect(ensureURLValidity(null)).toBe('')
      expect(ensureURLValidity(undefined)).toBe('')
      expect(ensureURLValidity('')).toBe('')
    })

    it('should keep valid URLs unchanged', () => {
      const validURLs = [
        'https://growthbook.plural.sh',
        'http://example.com/path',
        'ftp://files.example.com',
      ]

      validURLs.forEach((url) => {
        expect(ensureURLValidity(url)).toBe(url)
      })
    })

    it('should add https protocol to URLs without protocol', () => {
      expect(ensureURLValidity('www.example.com')).toBe(
        'https://www.example.com'
      )
      expect(ensureURLValidity('example.com/path')).toBe(
        'https://example.com/path'
      )
    })

    it('should return empty string for invalid URLs even after adding protocol', () => {
      expect(ensureURLValidity('not-a-url')).toBe('')
      expect(ensureURLValidity('localhost')).toBe('') // localhost is not valid per the regex
      expect(ensureURLValidity('/path/only')).toBe('')
    })

    it('should match examples from original tests', () => {
      const valid = 'https://growthbook.plural.sh'
      const transformedValid = ensureURLValidity(valid)

      expect(isValidURL(valid)).toBeTruthy()
      expect(transformedValid).toBe(valid)

      const invalid = 'minecraft.plural.sh:25565'
      const transformedInvalid = ensureURLValidity(invalid)

      expect(isValidURL(invalid)).toBeFalsy()
      expect(transformedInvalid).toBe('https://minecraft.plural.sh:25565')
      expect(isValidURL(transformedInvalid)).toBeTruthy()
    })
  })

  describe('getURLPath', () => {
    it('should extract path from valid URLs', () => {
      expect(getURLPath('https://example.com/path')).toBe('/path')
      expect(getURLPath('https://example.com/')).toBe('/')
      expect(getURLPath('https://example.com')).toBe('/')
      expect(getURLPath('https://example.com/path/to/resource')).toBe(
        '/path/to/resource'
      )
      expect(getURLPath('https://example.com/path?query=value')).toBe('/path')
      expect(getURLPath('https://example.com/path#fragment')).toBe('/path')
    })

    it('should handle URLs without protocol by adding https://', () => {
      expect(getURLPath('example.com/path')).toBe('/path')
      expect(getURLPath('www.example.com/test')).toBe('/test')
    })

    it('should return empty string for invalid URLs', () => {
      expect(getURLPath('not-a-url')).toBe('')
      expect(getURLPath('')).toBe('')
      expect(getURLPath(null)).toBe('')
      expect(getURLPath(undefined)).toBe('')
    })
  })
})
