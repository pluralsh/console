import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from '@apollo/client'
import { describe, expect, it } from 'vitest'
import { createWorkspaceApi, devboxBrowserUrl } from './devboxWorkspaceApi'

describe('cachedFiles', () => {
  it("returns a directory's last listing, keyed by path", async () => {
    const entry = {
      __typename: 'DevboxFileEntry',
      path: '/home/dev/a.ts',
      name: 'a.ts',
      type: 'file',
      size: 1,
      modifiedAt: null,
      symlinkTarget: null,
      repository: null,
      gitStatus: null,
    }
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(() =>
        Observable.of({ data: { devboxFiles: [entry] } })
      ),
    })
    const api = createWorkspaceApi(client, 'i1')
    expect(api.cachedFiles?.('~')).toBeNull()
    await api.listFiles?.('~')
    expect(api.cachedFiles?.('~')?.map((e) => e.name)).toEqual(['a.ts'])
    expect(api.cachedFiles?.('/home/dev/src')).toBeNull()
  })
})

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
