import { describe, expect, it } from 'vitest'
import { devboxBrowserUrl } from './devboxWorkspaceApi'

describe('devboxBrowserUrl', () => {
  it('treats a bare port as localhost', () => {
    expect(devboxBrowserUrl('3000')).toBe('http://localhost:3000')
    expect(devboxBrowserUrl(' 8080 ')).toBe('http://localhost:8080')
    expect(devboxBrowserUrl('70000')).toBeNull()
  })

  it('accepts http(s) urls, with or without a scheme', () => {
    expect(devboxBrowserUrl('localhost:5173/app')).toBe(
      'http://localhost:5173/app'
    )
    expect(devboxBrowserUrl('https://example.com')).toBe('https://example.com/')
  })

  it('rejects other schemes and garbage', () => {
    expect(devboxBrowserUrl('file:///etc/passwd')).toBeNull()
    expect(devboxBrowserUrl('javascript:alert(1)')).toBeNull()
    expect(devboxBrowserUrl('')).toBeNull()
  })
})
