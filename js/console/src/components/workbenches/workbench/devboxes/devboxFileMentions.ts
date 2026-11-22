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

// a picked directory is browsed into as typed text, keeping the menu open on its contents
export const directoryToken = (
  query: DevboxMentionQuery,
  entry: DevboxFileEntry
) => ({
  token: `${query.dir}${entry.name}/`,
  path: `${entry.path.replace(/\/$/, '')}/`,
})

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
