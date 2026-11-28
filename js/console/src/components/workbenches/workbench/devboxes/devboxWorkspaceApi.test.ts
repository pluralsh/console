import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from '@apollo/client'
import { describe, expect, it } from 'vitest'
import { createWorkspaceApi } from './devboxWorkspaceApi'

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
    const variables: Record<string, unknown>[] = []
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink((op) => {
        variables.push(op.variables)
        return Observable.of({ data: { devboxFiles: [entry] } })
      }),
    })
    const api = createWorkspaceApi(client, 'i1')
    expect(api.cachedFiles?.('~')).toBeNull()
    await api.listFiles?.('~')
    // the tree only shows names and types, which the instance lists from memory
    expect(variables).toEqual([{ instanceId: 'i1', path: null, brief: true }])
    expect(api.cachedFiles?.('~')?.map((e) => e.name)).toEqual(['a.ts'])
    expect(api.cachedFiles?.('/home/dev/src')).toBeNull()
  })
})
