import { DEVBOX_FILE_TAG } from 'components/ai/chatbot/DevboxFileChip'
import {
  CHIP_ATTR_PREFIX,
  CHIP_DATA_ATTR,
  CHIP_TAG_ATTR,
  insertChipAtRange,
  serializeEditableDiv,
  serializeRange,
} from 'components/utils/contentEditableChips'
import Fuse from 'fuse.js'
import { useEffect, useState } from 'react'
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

// the serialized prompt up to the caret, so offsets line up with `serializeEditableDiv`
export function caretOffset(container: HTMLElement): number {
  const sel = document.getSelection()
  const end = sel?.rangeCount ? sel.getRangeAt(0) : null
  if (!end || !container.contains(end.endContainer))
    return serializeEditableDiv(container).length
  const before = document.createRange()
  before.selectNodeContents(container)
  before.setEnd(end.endContainer, end.endOffset)
  return serializeRange(before).length
}

// replaces `before` characters before the caret and `after` after it (a typed
// token, never spanning a chip) with a chip or text, leaving the caret past it
export function replaceAtCaret(
  container: HTMLElement,
  before: number,
  after: number,
  replacement: HTMLElement | string
) {
  const sel = document.getSelection()
  const caret = sel?.rangeCount ? textCaret(sel.getRangeAt(0)) : null
  if (!sel || !caret) return
  const { node, offset } = caret
  const range = document.createRange()
  range.setStart(node, Math.max(0, offset - before))
  range.setEnd(node, Math.min(node.length, offset + after))
  if (typeof replacement === 'string') {
    range.deleteContents()
    const text = document.createTextNode(replacement)
    range.insertNode(text)
    range.setStart(text, text.length)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
  } else insertChipAtRange(container, replacement, range)
  container.dispatchEvent(new InputEvent('input', { bubbles: true }))
}

// the caret as a text position; after an insertion it can sit between nodes
function textCaret(range: Range): Nullable<{ node: Text; offset: number }> {
  const { endContainer: node, endOffset: offset } = range
  if (node instanceof Text) return { node, offset }
  const prev = node.childNodes[offset - 1]
  return prev instanceof Text ? { node: prev, offset: prev.length } : null
}

// an inline chip serializing to a file tag with the absolute path, which agents
// resolve regardless of their working directory
export function fileMentionChip(path: string): HTMLElement {
  const chip = document.createElement('span')
  chip.setAttribute(CHIP_DATA_ATTR, 'true')
  chip.setAttribute(CHIP_TAG_ATTR, DEVBOX_FILE_TAG)
  chip.setAttribute(`${CHIP_ATTR_PREFIX}path`, path)
  chip.setAttribute('contenteditable', 'false')
  chip.title = path
  const label = document.createElement('span')
  const name = path.replace(/\/$/, '').split('/').pop() || path
  label.textContent = path.endsWith('/') ? `${name}/` : name
  chip.appendChild(label)
  return chip
}

// a path as typed after the `@`: relative to the directory being completed
// when it's beneath it, else absolute
export const mentionPath = (
  query: DevboxMentionQuery,
  root: Nullable<string>,
  path: string
) =>
  root && path.startsWith(root)
    ? `${query.dir}${path.slice(root.length)}`
    : path

// a picked directory is browsed into as typed text, keeping the menu open on its contents
export const directoryToken = (
  query: DevboxMentionQuery,
  entry: DevboxFileEntry,
  root: Nullable<string>
) => {
  const path = `${entry.path.replace(/\/$/, '')}/`
  return { token: mentionPath(query, root, path), path }
}

// the absolute directory being completed, if known; home's is its entries' parent
export const mentionRoot = (
  dir: string,
  mentions: Record<string, string>,
  entries: DevboxFileEntry[]
): Nullable<string> =>
  dir ? resolveMentionDir(dir, mentions, entries) : parentOf(entries[0]?.path)

const parentOf = (path: Nullable<string>) =>
  path ? `${path.slice(0, path.lastIndexOf('/'))}/` : null

// the absolute path of the directory being browsed: as recorded when it was
// picked, else the parent of its entries, else the typed path when absolute
export function resolveMentionDir(
  dir: string,
  mentions: Record<string, string>,
  entries: DevboxFileEntry[]
): Nullable<string> {
  if (!dir) return null
  if (mentions[dir]) return mentions[dir]
  return parentOf(entries[0]?.path) ?? (dir.startsWith('/') ? dir : null)
}

type Listing = { entries: DevboxFileEntry[]; error?: boolean }

const directoryKey = (dir: string) => dir.replace(/\/$/, '') || '~'

// a failure only replaces a key's listing when there's none to keep showing
const settled = (
  cur: Record<string, Listing>,
  key: string,
  listing: Listing
): Record<string, Listing> => ({
  ...cur,
  [key]: listing.error && cur[key] && !cur[key].error ? cur[key] : listing,
})

// searches everything beneath the directory being completed, afresh each time
// a query comes up, keeping the last results up while the next ones load
export function useDevboxFileSearch(
  searchFiles: Nullable<
    (path: string, query: string) => Promise<DevboxFileEntry[]>
  >,
  dir: Nullable<string>,
  query: string
): { entries: DevboxFileEntry[]; loading: boolean; error: boolean } {
  const [results, setResults] = useState<Record<string, Listing>>({})
  const [last, setLast] = useState<Nullable<Listing & { path: string }>>(null)
  const path = dir == null || !query ? null : directoryKey(dir)
  const key = path && `${path}\n${query}`

  useEffect(() => {
    if (!searchFiles || !path || !key) return
    const settle = (listing: Listing) => {
      setResults((cur) => settled(cur, key, listing))
      if (!listing.error) setLast({ ...listing, path })
    }
    searchFiles(path, query).then(
      (entries) => settle({ entries }),
      () => settle({ entries: [], error: true })
    )
  }, [searchFiles, path, query, key])

  const listing = key
    ? (results[key] ?? (last?.path === path ? last : null))
    : null
  return {
    entries: listing?.entries ?? [],
    loading: !!key && !!searchFiles && !listing,
    error: !!listing?.error,
  }
}

// lists the directory being completed afresh each time it comes up, showing
// its last listing meanwhile
export function useDevboxDirectory(
  listFiles: Nullable<(path: string) => Promise<DevboxFileEntry[]>>,
  dir: Nullable<string>
): { entries: DevboxFileEntry[]; loading: boolean; error: boolean } {
  const [listings, setListings] = useState<Record<string, Listing>>({})
  const key = dir == null ? null : directoryKey(dir)

  useEffect(() => {
    if (!listFiles || !key) return
    listFiles(key).then(
      (entries) => setListings((cur) => settled(cur, key, { entries })),
      () =>
        setListings((cur) => settled(cur, key, { entries: [], error: true }))
    )
  }, [listFiles, key])

  const listing = key ? listings[key] : undefined
  return {
    entries: listing?.entries ?? [],
    loading: !!key && !!listFiles && !listing,
    error: !!listing?.error,
  }
}
