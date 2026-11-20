import { DEVBOX_FILE_TAG } from 'components/ai/chatbot/DevboxFileChip'
import Fuse from 'fuse.js'
import { useEffect, useRef, useState } from 'react'
import { DevboxFileEntry, isDirectory } from './devboxWorkspaceApi'

export type DevboxMentionQuery = {
  start: number
  end: number
  // the directory to list, relative to home unless absolute; '' for home
  dir: string
  leaf: string
}

// an `@path` token under the caret, starting the prompt or after whitespace
export function getMentionQuery(
  text: string,
  caret: number = text.length
): Nullable<DevboxMentionQuery> {
  const before = /(^|\s)@(\S*)$/.exec(text.slice(0, caret))
  if (!before) return null
  const path = before[2]
  const start = caret - path.length - 1
  const end = caret + (/^\S*/.exec(text.slice(caret))?.[0].length ?? 0)
  const slash = path.lastIndexOf('/')
  return {
    start,
    end,
    dir: path.slice(0, slash + 1),
    leaf: path.slice(slash + 1),
  }
}

export function matchFiles(
  entries: DevboxFileEntry[],
  leaf: string
): DevboxFileEntry[] {
  const visible = leaf.startsWith('.')
    ? entries
    : entries.filter((e) => !e.name.startsWith('.'))
  if (!leaf)
    return visible.toSorted(
      (a, b) =>
        Number(isDirectory(b)) - Number(isDirectory(a)) ||
        a.name.localeCompare(b.name)
    )
  const q = leaf.toLowerCase()
  const prefix = visible.filter((e) => e.name.toLowerCase().startsWith(q))
  const rest = new Fuse(
    visible.filter((e) => !prefix.includes(e)),
    { keys: ['name'], threshold: 0.4, ignoreLocation: true }
  )
    .search(leaf)
    .map(({ item }) => item)
  return [
    ...prefix.toSorted(
      (a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name)
    ),
    ...rest,
  ]
}

// directories keep the menu open on their contents; files insert their
// absolute path, which agents resolve regardless of their working directory
export function applyFileMention(
  text: string,
  query: DevboxMentionQuery,
  entry: DevboxFileEntry
) {
  const dir = isDirectory(entry)
  const token = dir ? `${query.dir}${entry.name}/` : entry.path
  const inserted = `@${token}${dir ? '' : ' '}`
  const after = text.slice(query.end).replace(/^ /, '')
  return {
    text: `${text.slice(0, query.start)}${inserted}${after}`,
    caret: query.start + inserted.length,
    token,
    path: dir ? `${entry.path.replace(/\/$/, '')}/` : entry.path,
  }
}

// the absolute path of the directory being browsed: as recorded when it was
// picked, else the parent of its entries, else the typed path when absolute
export function resolveMentionDir(
  dir: string,
  mentions: Record<string, string>,
  entries: DevboxFileEntry[]
): Nullable<string> {
  if (!dir) return null
  if (mentions[dir]) return mentions[dir]
  const child = entries[0]?.path
  if (child) return `${child.slice(0, child.lastIndexOf('/'))}/`
  return dir.startsWith('/') ? dir : null
}

// mentions the browsed directory itself, closing the menu like a file does
export function applyFolderMention(
  text: string,
  query: DevboxMentionQuery,
  path: string
) {
  const inserted = `@${path} `
  const after = text.slice(query.end).replace(/^ /, '')
  return {
    text: `${text.slice(0, query.start)}${inserted}${after}`,
    caret: query.start + inserted.length,
    token: path,
    path,
  }
}

// picked mentions (token → path) still in the prompt become file tags; typed `@` text is left alone
export function compileFileMentions(
  text: string,
  mentions: Record<string, string>
) {
  return Object.entries(mentions).reduce(
    (acc, [token, path]) =>
      acc.replace(
        new RegExp(`(^|\\s)@${escapeRegExp(token)}(?=\\s|$)`, 'g'),
        (_, lead: string) =>
          `${lead}<${DEVBOX_FILE_TAG} path="${escapeAttribute(path)}"></${DEVBOX_FILE_TAG}>`
      ),
    text
  )
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const escapeAttribute = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

type Listing = { entries: DevboxFileEntry[]; error?: boolean }

// lists the directory being completed, caching each one for the composer's lifetime
export function useDevboxDirectory(
  listFiles: Nullable<(path: string) => Promise<DevboxFileEntry[]>>,
  dir: Nullable<string>
): { entries: DevboxFileEntry[]; loading: boolean; error: boolean } {
  const [listings, setListings] = useState<Record<string, Listing>>({})
  const requested = useRef(new Set<string>())
  const key = dir == null ? null : dir.replace(/\/$/, '') || '~'

  useEffect(() => {
    if (!listFiles || !key || requested.current.has(key)) return
    requested.current.add(key)
    listFiles(key).then(
      (entries) => setListings((cur) => ({ ...cur, [key]: { entries } })),
      () =>
        setListings((cur) => ({ ...cur, [key]: { entries: [], error: true } }))
    )
  }, [listFiles, key])

  const listing = key ? listings[key] : undefined
  return {
    entries: listing?.entries ?? [],
    loading: !!key && !!listFiles && !listing,
    error: !!listing?.error,
  }
}
