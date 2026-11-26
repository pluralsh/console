import { ApolloClient, useApolloClient } from '@apollo/client'
import {
  DevboxChangesQuery,
  DevboxChangesQueryVariables,
  DevboxFileQuery,
  DevboxFileQueryVariables,
  DevboxFilesQuery,
  DevboxFilesQueryVariables,
  DevboxStreamKind as DevboxStreamKindEnum,
  OpenDevboxStreamMutation,
  OpenDevboxStreamMutationVariables,
  WriteDevboxFileMutation,
  WriteDevboxFileMutationVariables,
} from 'generated/graphql'
import {
  DevboxChangesDocument,
  DevboxFileDocument,
  DevboxFilesDocument,
  OpenDevboxStreamDocument,
  WriteDevboxFileDocument,
} from 'generated/graphql-documents'
import { useMemo } from 'react'
import { isNonNullable } from 'utils/isNonNullable'

export type DevboxStreamKind = 'terminal' | 'vnc' | 'preview'

export type DevboxStreamTicket = {
  streamId?: Nullable<string>
  url: string
  token: string
  expiresAt?: Nullable<string>
  subprotocols?: Nullable<Nullable<string>[]>
  terminalId?: Nullable<string>
}

export type DevboxOpenStreamOptions = {
  kind: DevboxStreamKind
  port?: number
  terminalId?: Nullable<string>
  // vnc: open this url in the instance's browser
  url?: string
}

export type DevboxFileEntry = {
  path: string
  name: string
  type: 'file' | 'directory' | 'symlink' | string
  size?: Nullable<number>
  gitStatus?: Nullable<string>
}

export type DevboxFileContent = {
  path: string
  content: Nullable<string>
  sha256?: Nullable<string>
  binary?: Nullable<boolean>
  truncated?: Nullable<boolean>
}

export type DevboxChangedFile = {
  path: string
  oldPath?: Nullable<string>
  status?: Nullable<string>
  additions?: Nullable<number>
  deletions?: Nullable<number>
  patch?: Nullable<string>
  binary?: Nullable<boolean>
}

export type DevboxChangeGroup = {
  repository: string
  path?: Nullable<string>
  branch?: Nullable<string>
  remoteUrl?: Nullable<string>
  files: DevboxChangedFile[]
}

// live workspace access through the gateway; views render an unavailable
// state for any operation left undefined
export type DevboxWorkspaceApi = {
  openStream?: (opts: DevboxOpenStreamOptions) => Promise<DevboxStreamTicket>
  // entries are brief, with no size or git status, which lets the instance
  // list from memory rather than disk
  listFiles?: (path: string) => Promise<DevboxFileEntry[]>
  // the best fuzzy matches for query anywhere under path
  searchFiles?: (path: string, query: string) => Promise<DevboxFileEntry[]>
  // the last listing of a directory, if any, to show while listFiles refreshes it
  cachedFiles?: (path: string) => Nullable<DevboxFileEntry[]>
  readFile?: (path: string) => Promise<DevboxFileContent>
  writeFile?: (
    path: string,
    content: string,
    expectedSha256?: Nullable<string>
  ) => Promise<DevboxFileContent>
  changes?: (threadId?: Nullable<string>) => Promise<DevboxChangeGroup[]>
}

const STREAM_KINDS: Record<DevboxStreamKind, DevboxStreamKindEnum> = {
  terminal: DevboxStreamKindEnum.Terminal,
  vnc: DevboxStreamKindEnum.Vnc,
  preview: DevboxStreamKindEnum.Preview,
}

export const isDirectory = (entry: Pick<DevboxFileEntry, 'type'>) =>
  entry.type === 'directory' || entry.type === 'dir'

export function useDevboxWorkspaceApi(
  instanceId: Nullable<string>
): DevboxWorkspaceApi {
  const client = useApolloClient()
  return useMemo(
    () => (instanceId ? createWorkspaceApi(client, instanceId) : {}),
    [client, instanceId]
  )
}

export function createWorkspaceApi(
  client: ApolloClient<unknown>,
  instanceId: string
): DevboxWorkspaceApi {
  const filesVariables = (path: string) => ({
    instanceId,
    path: path === '~' ? null : path,
    brief: true,
  })
  return {
    openStream: async ({ kind, port, terminalId, url }) => {
      const { data } = await client.mutate<
        OpenDevboxStreamMutation,
        OpenDevboxStreamMutationVariables
      >({
        mutation: OpenDevboxStreamDocument,
        variables: {
          instanceId,
          kind: STREAM_KINDS[kind],
          port,
          terminalId,
          url,
        },
      })
      const stream = data?.openDevboxStream
      if (!stream) throw new Error('Console returned no stream')
      return stream
    },
    listFiles: async (path) => {
      const { data } = await client.query<
        DevboxFilesQuery,
        DevboxFilesQueryVariables
      >({
        query: DevboxFilesDocument,
        variables: filesVariables(path),
        fetchPolicy: 'network-only',
      })
      return toFileEntries(data)
    },
    searchFiles: async (path, query) => {
      const { data } = await client.query<
        DevboxFilesQuery,
        DevboxFilesQueryVariables
      >({
        query: DevboxFilesDocument,
        variables: { ...filesVariables(path), query },
        fetchPolicy: 'no-cache',
      })
      return toFileEntries(data)
    },
    cachedFiles: (path) => {
      const data = client.readQuery<
        DevboxFilesQuery,
        DevboxFilesQueryVariables
      >({ query: DevboxFilesDocument, variables: filesVariables(path) })
      return data ? toFileEntries(data) : null
    },
    readFile: async (path) => {
      const { data } = await client.query<
        DevboxFileQuery,
        DevboxFileQueryVariables
      >({
        query: DevboxFileDocument,
        variables: { instanceId, path },
        fetchPolicy: 'network-only',
      })
      const file = data?.devboxFile
      if (!file) throw new Error(`${path} not found`)
      return {
        path,
        content: file.content,
        sha256: file.sha256,
        binary: file.binary,
        truncated: file.truncated,
      }
    },
    writeFile: async (path, content, expectedSha256) => {
      const { data } = await client.mutate<
        WriteDevboxFileMutation,
        WriteDevboxFileMutationVariables
      >({
        mutation: WriteDevboxFileDocument,
        variables: { instanceId, path, content, expectedSha256 },
      })
      return { path, content, sha256: data?.writeDevboxFile?.sha256 }
    },
    changes: async (threadId) => {
      const { data } = await client.query<
        DevboxChangesQuery,
        DevboxChangesQueryVariables
      >({
        query: DevboxChangesDocument,
        variables: { instanceId, threadId, includeDiff: true },
        fetchPolicy: 'network-only',
      })
      return toChangeGroups(data)
    },
  }
}

function toFileEntries(data: Nullable<DevboxFilesQuery>): DevboxFileEntry[] {
  return (data?.devboxFiles ?? []).filter(isNonNullable).map((e) => ({
    path: e.path,
    name: e.name ?? e.path.split('/').pop() ?? e.path,
    type: e.type ?? 'file',
    size: e.size,
    gitStatus: e.gitStatus,
  }))
}

export function toChangeGroups(
  data: Nullable<DevboxChangesQuery>
): DevboxChangeGroup[] {
  return (data?.devboxChanges ?? []).filter(isNonNullable).map((g) => ({
    repository: g.checkout?.name ?? g.checkout?.path ?? 'workspace',
    path: g.checkout?.path,
    branch: g.checkout?.branch,
    remoteUrl: g.checkout?.remoteUrl,
    files: (g.files ?? []).filter(isNonNullable).map((f) => ({
      path: f.path,
      oldPath: f.oldPath,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      binary: f.binary,
      patch:
        f.diffTruncated && f.diff ? `${f.diff}\n… (diff truncated)` : f.diff,
    })),
  }))
}

// browsers can't set headers on WebSockets, so the token rides in the query
export function devboxStreamSocketUrl(
  ticket: DevboxStreamTicket,
  query: Record<string, string | number | undefined> = {}
) {
  const url = new URL(ticket.url, window.location.href)
  if (url.protocol === 'http:') url.protocol = 'ws:'
  if (url.protocol === 'https:') url.protocol = 'wss:'
  url.searchParams.set('token', ticket.token)
  for (const [k, v] of Object.entries(query))
    if (v !== undefined) url.searchParams.set(k, `${v}`)
  return url.toString()
}

export const ticketSubprotocols = (ticket: DevboxStreamTicket) =>
  (ticket.subprotocols ?? []).filter((p): p is string => !!p)

// The page loads in the instance's own browser, so the app sees localhost and its absolute URLs resolve.
export function devboxBrowserUrl(target: string) {
  const t = target.trim()
  if (/^\d{2,5}$/.test(t))
    return Number(t) <= 65535 ? `http://localhost:${t}` : null
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(t) ? t : `http://${t}`)
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : null
  } catch {
    return null
  }
}
