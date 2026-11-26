// Devbox prompt chips: their tags and labels, shared by the composer (which
// builds and restores them) and the transcript (which renders them).

// <plrl-devbox-file path="/home/plural/repo/main.go"></plrl-devbox-file>; a trailing `/` marks a directory
export const DEVBOX_FILE_TAG = 'plrl-devbox-file'
export const DEVBOX_FILE_ATTRIBUTES = ['path']

// an element picked in the box's browser, which the agent can find again with
// its selector on the page at url
export const DEVBOX_ELEMENT_TAG = 'plrl-devbox-element'
export const DEVBOX_ELEMENT_ATTRIBUTES = [
  'url',
  'selector',
  'tag',
  'text',
  'html',
]

export const DEVBOX_CHIP_TAGS = [DEVBOX_FILE_TAG, DEVBOX_ELEMENT_TAG]

const ELEMENT_TEXT_LABEL = 32

export function elementLabel(attrs: Record<string, Nullable<string>>) {
  const tag = attrs.tag || 'element'
  const text = attrs.text?.trim()
  if (!text) return `<${tag}>`
  const short =
    text.length > ELEMENT_TEXT_LABEL
      ? `${text.slice(0, ELEMENT_TEXT_LABEL - 1)}…`
      : text
  return `<${tag}> ${short}`
}

// a devbox chip's label and tooltip, or null for other tags and chips missing
// what identifies them
export function devboxChip(
  tag: string,
  attrs: Record<string, Nullable<string>>
): Nullable<{ label: string; title: string }> {
  if (tag === DEVBOX_FILE_TAG && attrs.path) {
    const name = attrs.path.replace(/\/$/, '').split('/').pop() || attrs.path
    return {
      label: attrs.path.endsWith('/') ? `${name}/` : name,
      title: attrs.path,
    }
  }
  if (tag === DEVBOX_ELEMENT_TAG && attrs.selector)
    return {
      label: elementLabel(attrs),
      title: attrs.url ? `${attrs.selector}\n${attrs.url}` : attrs.selector,
    }
  return null
}
