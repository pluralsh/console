/**
 * Chip primitives for `contenteditable` editors.
 *
 * A "chip" is a non-editable inline `<span data-chip="true">` whose payload is
 * stored in `data-attr-*` attributes and reconstructed when the editor value
 * is serialized to canonical `<plrl-*>` XML.
 */

import {
  chipDisplayText,
  MentionKind,
} from 'components/ai/chatbot/input/autocomplete/mentionTypes'
import escape from 'lodash/escape'
import unescape from 'lodash/unescape'

export const CHIP_DATA_ATTR = 'data-chip'
export const CHIP_TAG_ATTR = 'data-plrl-tag'
export const CHIP_ATTR_PREFIX = 'data-attr-'

const PLRL_CHIP_REGEX = new RegExp(
  `<(${Object.values(MentionKind).join('|')})\\b([^>]*)></\\1>`,
  'gi'
)
const CHIP_ATTR_REGEX = /([a-z-]+)\s*=\s*"([^"]*)"/g

const ZWSP = '​'

export const stripZwsp = (text: string): string => text.replace(/​/g, '')
export const isChipNode = (node: Nullable<Node>): boolean =>
  !!node &&
  node.nodeType === Node.ELEMENT_NODE &&
  (node as HTMLElement).getAttribute?.(CHIP_DATA_ATTR) === 'true'

/** Length of leading spaces + ZWSP run (auto-inserted after a chip). */
function leadingChipFillerLen(text: string): number {
  return /^[\s\u200B]*/.exec(text)?.[0].length ?? 0
}

/**
 * Convert a chip DOM node back to its XML form by reading its `data-attr-*`
 * attributes. Always emits an explicit close tag — HTML5 doesn't honor
 * self-closing on unknown elements.
 */
export function serializeChip(el: HTMLElement): string {
  const tag = el.getAttribute(CHIP_TAG_ATTR) ?? 'plrl-unknown'
  const attrs: string[] = []
  for (const attr of Array.from(el.attributes)) {
    if (!attr.name.startsWith(CHIP_ATTR_PREFIX)) continue
    const xmlName = attr.name.slice(CHIP_ATTR_PREFIX.length)
    attrs.push(`${xmlName}="${escape(attr.value)}"`)
  }
  return `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}></${tag}>`
}

/** Serialize the contents of a Range to canonical text (chips → XML). */
export function serializeRange(range: Range): string {
  const wrapper = document.createElement('div')
  wrapper.appendChild(range.cloneContents())
  return serializeEditableDiv(wrapper)
}

/**
 * Walk the editor DOM and emit canonical text — chip nodes serialize to XML,
 * other nodes contribute their text (with ZWSP sentinels stripped).
 */
export function serializeEditableDiv(container: HTMLElement): string {
  let out = ''
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += stripZwsp(node.nodeValue ?? '')
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement
    if (el.getAttribute(CHIP_DATA_ATTR) === 'true') {
      out += serializeChip(el)
      return
    }
    if (el.tagName === 'BR') {
      out += '\n'
      return
    }
    for (const child of Array.from(el.childNodes)) walk(child)
    if (el.tagName === 'DIV' && el !== container) out += '\n'
  }
  for (const child of Array.from(container.childNodes)) walk(child)
  return out
}

/**
 * Insert the chip followed by a normal space (so the user can keep typing) and a
 * trailing ZWSP — the sentinel gives the caret a landing site after the
 * non-editable chip, which Safari/Firefox need.
 */
export function insertChipWithSentinels(range: Range, chip: HTMLElement): void {
  const trailing = document.createTextNode(` ${ZWSP}`)
  range.insertNode(chip)
  range.setStartAfter(chip)
  range.insertNode(trailing)
  range.setStartAfter(trailing)
}

export function insertChipAtRange(
  container: HTMLElement,
  chip: HTMLElement,
  replaceRange?: Range
): void {
  const selection = document.getSelection()
  let range = replaceRange
  if (!range) {
    if (!selection?.rangeCount) {
      container.appendChild(chip)
      container.appendChild(document.createTextNode(` ${ZWSP}`))
      return
    }
    range = selection.getRangeAt(0).cloneRange()
  }
  range.deleteContents()
  insertChipWithSentinels(range, chip)
  selection?.removeAllRanges()
  selection?.addRange(range)
}

/** Build a chip span from a flat attribute map. */
export function buildChipFromAttrs(
  tag: MentionKind,
  attrs: Record<string, Nullable<string>>
): HTMLElement {
  const span = document.createElement('span')
  span.setAttribute(CHIP_DATA_ATTR, 'true')
  span.setAttribute(CHIP_TAG_ATTR, tag)
  span.setAttribute('contenteditable', 'false')
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === '') continue
    span.setAttribute(`${CHIP_ATTR_PREFIX}${k}`, v)
  }
  const label = chipDisplayText(tag, attrs)
  // wrap text in an inner span for highlight styling
  const inner = document.createElement('span')
  inner.textContent = tag === MentionKind.Skill ? `/${label}` : label
  span.appendChild(inner)
  return span
}

type WalkedPlrlNode =
  | {
      type: 'chip'
      tag: MentionKind
      attrs: Record<string, string>
      /** original matched XML — preserved for chip-aware truncation. */
      raw: string
    }
  | { type: 'text'; text: string }

/**
 * Replace `<plrl-*>` chip XML with `@name` (or `/name` for skills) for plain
 * text contexts (table cells, toasts, breadcrumbs) where the markdown
 * renderer that turns them into pills isn't running.
 */
export function prettifyPrompt(text: string): string {
  if (!text.includes('<plrl-')) return text
  return walkPlrlText(text)
    .map((n) =>
      n.type === 'chip'
        ? (n.tag === MentionKind.Skill ? '/' : '@') +
          chipDisplayText(n.tag, n.attrs)
        : n.text
    )
    .join('')
}

/**
 * Truncate `text` to roughly `length` *visible* characters without splitting
 * chip XML — chips count as their `@name`/`/name` display form toward the
 * budget but are emitted as full XML, so a downstream markdown renderer can
 * still render them as pills.
 */
export function truncateKeepingChips(text: string, length: number): string {
  if (text.length <= length) return text
  if (!text.includes('<plrl-')) return text.slice(0, length - 3) + '...'
  let out = ''
  let remaining = length - 3
  for (const node of walkPlrlText(text)) {
    const [content, visibleLen] =
      node.type === 'chip'
        ? [node.raw, 1 + chipDisplayText(node.tag, node.attrs).length]
        : [node.text, node.text.length]
    if (visibleLen > remaining) {
      if (node.type === 'text' && remaining > 0)
        out += content.slice(0, remaining)
      break
    }
    out += content
    remaining -= visibleLen
  }
  return out + '...'
}

/**
 * Replace `range` with parsed chip+text from `text` — used by paste so chip
 * XML on the clipboard reconstructs as live chip nodes. Plain text yields a
 * single text node, equivalent to the no-chip fast path.
 */
export function insertPlrlText(range: Range, text: string): void {
  for (const node of walkPlrlText(text)) {
    if (node.type === 'chip') {
      insertChipWithSentinels(range, buildChipFromAttrs(node.tag, node.attrs))
    } else {
      const tn = document.createTextNode(node.text)
      range.insertNode(tn)
      range.setStartAfter(tn)
      range.collapse(true)
    }
  }
}

/**
 * If the caret sits immediately after a chip (allowing a trailing ZWSP),
 * return that chip — used so Backspace deletes whole chips atomically.
 */
export function chipBeforeCaret(container: HTMLElement): HTMLElement | null {
  const sel = document.getSelection()
  if (!sel?.rangeCount || !sel.isCollapsed) return null
  const range = sel.getRangeAt(0)
  if (!container.contains(range.startContainer)) return null

  const node: Node = range.startContainer
  const offset = range.startOffset

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue ?? ''
    const before = text.slice(0, offset)
    if (!/^[\s\u200B]*$/.test(before)) return null
    const endFiller = leadingChipFillerLen(text)
    if (offset > endFiller) return null
    if (offset === endFiller && endFiller < text.length) return null
    const prev = node.previousSibling
    if (prev && isChipNode(prev)) return prev as HTMLElement
    return null
  }

  if (offset === 0) return null
  const prev = node.childNodes[offset - 1]
  if (isChipNode(prev)) return prev as HTMLElement
  if (prev?.nodeType === Node.TEXT_NODE) {
    const text = prev.nodeValue ?? ''
    const endFiller = leadingChipFillerLen(text)
    if (endFiller === text.length) {
      const beforeChip = prev.previousSibling
      if (beforeChip && isChipNode(beforeChip)) return beforeChip as HTMLElement
    }
  }
  return null
}

export function deleteChip(chip: HTMLElement): void {
  let next = chip.nextSibling
  while (next?.nodeType === Node.TEXT_NODE) {
    const text = next.nodeValue ?? ''
    const endFiller = leadingChipFillerLen(text)
    if (endFiller === 0) break
    if (endFiller === text.length) {
      const toRemove = next
      next = next.nextSibling
      toRemove.remove()
      continue
    }
    next.nodeValue = text.slice(endFiller)
    break
  }
  chip.remove()
}

// Regex-based (not DOMParser) so static analyzers don't flag it as an
// HTML-from-input sink — the format is well-defined by `serializeChip`.
function walkPlrlText(text: string): WalkedPlrlNode[] {
  const out: WalkedPlrlNode[] = []
  let lastIdx = 0
  for (const match of text.matchAll(PLRL_CHIP_REGEX)) {
    const matchIdx = match.index ?? 0
    if (matchIdx > lastIdx)
      out.push({ type: 'text', text: text.slice(lastIdx, matchIdx) })
    const tag = match[1].toLowerCase() as MentionKind
    const attrs: Record<string, string> = {}
    for (const attrMatch of match[2].matchAll(CHIP_ATTR_REGEX))
      attrs[attrMatch[1]] = unescape(attrMatch[2])
    if (attrs['item-id'] && attrs['item-name'])
      out.push({ type: 'chip', tag, attrs, raw: match[0] })
    else out.push({ type: 'text', text: match[0] })
    lastIdx = matchIdx + match[0].length
  }
  if (lastIdx < text.length)
    out.push({ type: 'text', text: text.slice(lastIdx) })
  return out
}
