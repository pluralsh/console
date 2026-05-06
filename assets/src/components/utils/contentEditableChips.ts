/**
 * Generic chip primitives for `contenteditable` editors.
 *
 * A "chip" is a non-editable inline `<span data-chip="true">` whose stored
 * payload is reconstructed from `data-attr-*` attributes when the editor's
 * value is serialized. Mention-specific code (e.g. `mentionShorthand.ts`)
 * builds chips on top of these primitives by emitting the right attributes.
 */

export const CHIP_DATA_ATTR = 'data-chip'
export const CHIP_TAG_ATTR = 'data-plrl-tag'
export const CHIP_ATTR_PREFIX = 'data-attr-'

export const ZWSP = '​'

export function stripZwsp(text: string): string {
  return text.replace(/​/g, '')
}

export function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function attrsToString(
  attrs: Record<string, string | null | undefined>
): string {
  return Object.entries(attrs)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}="${escapeXmlAttr(String(v))}"`)
    .join(' ')
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
    attrs.push(`${xmlName}="${escapeXmlAttr(attr.value)}"`)
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
  // ZWSP sentinels let the caret land on either side of the non-editable chip
  const before = document.createTextNode(ZWSP)
  const after = document.createTextNode(ZWSP)
  range.insertNode(after)
  range.insertNode(chip)
  range.insertNode(before)
  const newRange = document.createRange()
  newRange.setStartAfter(after)
  newRange.collapse(true)
  selection?.removeAllRanges()
  selection?.addRange(newRange)
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
  if (
    prev?.nodeType === Node.TEXT_NODE &&
    stripZwsp(prev.nodeValue ?? '').length === 0
  )
    prev.parentNode?.removeChild(prev)
  if (
    next?.nodeType === Node.TEXT_NODE &&
    stripZwsp(next.nodeValue ?? '').length === 0
  )
    next.parentNode?.removeChild(next)
  chip.remove()
}
