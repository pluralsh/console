/**
 * Chip primitives for `contenteditable` editors.
 *
 * A "chip" is a non-editable inline `<span data-chip="true">` whose payload is
 * stored in `data-attr-*` attributes and reconstructed when the editor value
 * is serialized to canonical `<plrl-*>` XML.
 */

import {
  MentionKind,
  PLRL_CHIP_TAG_NAMES,
} from 'components/ai/chatbot/input/autocomplete/mentionTypes'
import escape from 'lodash/escape'

export const CHIP_DATA_ATTR = 'data-chip'
export const CHIP_TAG_ATTR = 'data-plrl-tag'
export const CHIP_ATTR_PREFIX = 'data-attr-'

const PLRL_TAG_SET: ReadonlySet<string> = new Set(PLRL_CHIP_TAG_NAMES)

const ZWSP = '​'

export function stripZwsp(text: string): string {
  return text.replace(/​/g, '')
}

export function isChipNode(node: Node | null | undefined): boolean {
  return (
    !!node &&
    node.nodeType === Node.ELEMENT_NODE &&
    (node as HTMLElement).getAttribute?.(CHIP_DATA_ATTR) === 'true'
  )
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

/**
 * Walk the editor DOM and emit canonical text — chip nodes serialize to XML,
 * other nodes contribute their text (with ZWSP sentinels stripped).
 */
export function serializeEditableValue(container: HTMLElement): string {
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
 * Insert ZWSP+chip+ZWSP at `range` and advance the range to just after the
 * trailing ZWSP. Sentinels let the caret land on either side of the
 * non-editable chip span.
 */
export function insertChipWithSentinels(range: Range, chip: HTMLElement): void {
  const before = document.createTextNode(ZWSP)
  const after = document.createTextNode(ZWSP)
  range.insertNode(before)
  range.setStartAfter(before)
  range.collapse(true)
  range.insertNode(chip)
  range.setStartAfter(chip)
  range.collapse(true)
  range.insertNode(after)
  range.setStartAfter(after)
  range.collapse(true)
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
      container.appendChild(document.createTextNode(ZWSP))
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
  const name = attrs['item-name'] ?? ''
  span.textContent = tag === MentionKind.Skill ? `/${name}` : name
  return span
}

/** Serialize the contents of a Range to canonical text (chips → XML). */
export function serializeRange(range: Range): string {
  const wrapper = document.createElement('div')
  wrapper.appendChild(range.cloneContents())
  return serializeEditableValue(wrapper)
}

export type WalkedPlrlNode =
  | { type: 'chip'; tag: MentionKind; attrs: Record<string, string> }
  | { type: 'text'; text: string }

/**
 * Parse canonical chip text (mixed prose + `<plrl-*>` XML) into a sequence of
 * chip and text nodes. Shared by paste (→ DOM) and display (→ shorthand).
 */
export function walkPlrlText(text: string): WalkedPlrlNode[] {
  const doc = new DOMParser().parseFromString(text, 'text/html')
  const out: WalkedPlrlNode[] = []
  for (const node of Array.from(doc.body.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      out.push({ type: 'text', text: node.nodeValue ?? '' })
      continue
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()
    if (PLRL_TAG_SET.has(tag)) {
      const attrs: Record<string, string> = {}
      for (const attr of Array.from(el.attributes))
        attrs[attr.name] = attr.value
      if (attrs['item-id'] && attrs['item-name']) {
        out.push({ type: 'chip', tag: tag as MentionKind, attrs })
        continue
      }
    }
    out.push({ type: 'text', text: el.textContent ?? '' })
  }
  return out
}

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
          (n.attrs['item-name'] ?? '')
        : n.text
    )
    .join('')
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
    if (stripZwsp(before).length > 0) return null
    const prev = node.previousSibling
    if (prev && isChipNode(prev)) return prev as HTMLElement
    return null
  }

  if (offset === 0) return null
  const prev = node.childNodes[offset - 1]
  if (isChipNode(prev)) return prev as HTMLElement
  if (prev?.nodeType === Node.TEXT_NODE) {
    const text = prev.nodeValue ?? ''
    if (stripZwsp(text).length > 0) return null
    const beforePrev = prev.previousSibling
    if (beforePrev && isChipNode(beforePrev)) return beforePrev as HTMLElement
  }
  return null
}

export function deleteChip(chip: HTMLElement): void {
  const prev = chip.previousSibling
  const next = chip.nextSibling
  // pure-ZWSP siblings get removed entirely; siblings fused with typed text
  // (Chrome will append a typed char to a ZWSP text node) get their leading
  // or trailing ZWSPs stripped so no leftover ZWSP confuses caret-context code.
  if (prev?.nodeType === Node.TEXT_NODE) {
    const text = prev.nodeValue ?? ''
    if (stripZwsp(text).length === 0) prev.parentNode?.removeChild(prev)
    else prev.nodeValue = text.replace(/​+$/, '')
  }
  if (next?.nodeType === Node.TEXT_NODE) {
    const text = next.nodeValue ?? ''
    if (stripZwsp(text).length === 0) next.parentNode?.removeChild(next)
    else next.nodeValue = text.replace(/^​+/, '')
  }
  chip.remove()
}
