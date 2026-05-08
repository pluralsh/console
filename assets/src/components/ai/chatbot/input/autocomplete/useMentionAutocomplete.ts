import {
  buildChipFromAttrs,
  insertChipAtRange,
  isChipNode,
  stripZwsp,
} from 'components/utils/contentEditableChips'
import {
  KeyboardEvent,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { ChipAttrs, MENTION_TRIGGERS, MentionTrigger } from './mentionTypes'
import { useMentionDataSources } from './useMentionDataSources'

type TriggerPosition = {
  trigger: MentionTrigger
  textNode: Text
  offset: number
}

export type MentionAutocompleteState = {
  isOpen: boolean
  trigger: MentionTrigger | null
  query: string
  items: ChipAttrs[]
  highlightedIndex: number
  anchorRect: DOMRect | null
  loading: boolean
}

const isTrigger = (ch: string): ch is MentionTrigger =>
  (MENTION_TRIGGERS as ReadonlyArray<string>).includes(ch)

// Trigger is valid only at the start of the editor or immediately after
// whitespace or another chip — same convention as Slack/Cursor.
function triggerHasValidContext(textNode: Text, offset: number): boolean {
  if (offset > 0) {
    const before = stripZwsp(textNode.nodeValue?.slice(0, offset) ?? '')
    if (before.length === 0) return true
    return /\s/.test(before[before.length - 1])
  }
  const prevSibling = textNode.previousSibling
  if (!prevSibling) return true
  if (isChipNode(prevSibling)) return true
  if (prevSibling.nodeType === Node.TEXT_NODE) {
    const text = stripZwsp(prevSibling.nodeValue ?? '')
    const lastChar = text[text.length - 1]
    return !lastChar || /\s/.test(lastChar)
  }
  return false
}

export function useMentionAutocomplete({
  containerRef,
  workbenchId,
  enabled,
}: {
  containerRef: RefObject<HTMLElement | null>
  workbenchId?: Nullable<string>
  enabled: boolean
}) {
  const triggerPosRef = useRef<TriggerPosition | null>(null)
  const [trigger, setTrigger] = useState<MentionTrigger | null>(null)
  const [query, setQuery] = useState('')
  const [rawHighlightedIndex, setHighlightedIndex] = useState(0)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  const { items, loading } = useMentionDataSources({
    trigger,
    query,
    workbenchId,
    enabled,
  })

  // Clamp on read so we don't need an effect to sync state with item count.
  const highlightedIndex =
    items.length === 0 ? 0 : Math.min(rawHighlightedIndex, items.length - 1)

  const close = useCallback(() => {
    triggerPosRef.current = null
    setTrigger(null)
    setQuery('')
    setHighlightedIndex(0)
    setAnchorRect(null)
  }, [])

  const computeAnchorRect = useCallback((): DOMRect | null => {
    const sel = document.getSelection()
    if (sel?.rangeCount) {
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      if (rect.width > 0 || rect.height > 0 || rect.x !== 0 || rect.y !== 0)
        return rect
    }
    return containerRef.current?.getBoundingClientRect() ?? null
  }, [containerRef])

  const updateFromCaret = useCallback(() => {
    const pos = triggerPosRef.current
    if (!pos) return
    const sel = document.getSelection()
    if (!sel?.rangeCount || !sel.isCollapsed) {
      close()
      return
    }
    const range = sel.getRangeAt(0)
    const container = containerRef.current
    if (!container || !container.contains(range.startContainer)) {
      close()
      return
    }
    // Only support the simple in-text-node case: trigger and caret share a node
    if (range.startContainer !== pos.textNode) {
      close()
      return
    }
    if (range.startOffset <= pos.offset) {
      close()
      return
    }
    const slice =
      pos.textNode.nodeValue?.slice(pos.offset + 1, range.startOffset) ?? ''
    // any whitespace breaks the mention
    if (/\s/.test(slice)) {
      close()
      return
    }
    // trigger char itself was deleted
    if (pos.textNode.nodeValue?.[pos.offset] !== pos.trigger) {
      close()
      return
    }
    setQuery(slice)
    setAnchorRect(computeAnchorRect())
  }, [close, computeAnchorRect, containerRef])

  // After the editor's input event, decide whether to open a new mention
  // or update the existing one.
  const onInput = useCallback(() => {
    if (!enabled) return
    const sel = document.getSelection()
    if (!sel?.rangeCount || !sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    const container = containerRef.current
    if (!container || !container.contains(range.startContainer)) return

    // If a trigger is already armed, just update.
    if (triggerPosRef.current) {
      updateFromCaret()
      return
    }

    if (range.startContainer.nodeType !== Node.TEXT_NODE) return
    const textNode = range.startContainer as Text
    const offset = range.startOffset
    if (offset === 0) return
    const ch = textNode.nodeValue?.[offset - 1] ?? ''
    if (!isTrigger(ch)) return
    if (!triggerHasValidContext(textNode, offset - 1)) return

    triggerPosRef.current = {
      trigger: ch,
      textNode,
      offset: offset - 1,
    }
    setTrigger(ch)
    setQuery('')
    setHighlightedIndex(0)
    setAnchorRect(computeAnchorRect())
  }, [enabled, containerRef, updateFromCaret, computeAnchorRect])

  // Track caret movements (arrow keys, clicks) that aren't input events.
  useEffect(() => {
    if (!enabled || !trigger) return
    const handler = () => updateFromCaret()
    document.addEventListener('selectionchange', handler)
    return () => document.removeEventListener('selectionchange', handler)
  }, [enabled, trigger, updateFromCaret])

  const commit = useCallback(
    ({ kind, ...attrs }: ChipAttrs) => {
      const pos = triggerPosRef.current
      const container = containerRef.current
      if (!pos || !container) {
        close()
        return
      }
      const sel = document.getSelection()
      if (!sel?.rangeCount) {
        close()
        return
      }
      const replaceRange = document.createRange()
      try {
        replaceRange.setStart(pos.textNode, pos.offset)
        replaceRange.setEnd(
          sel.getRangeAt(0).endContainer,
          sel.getRangeAt(0).endOffset
        )
      } catch {
        close()
        return
      }
      insertChipAtRange(
        container,
        buildChipFromAttrs(kind, attrs),
        replaceRange
      )
      // notify the editor so React state syncs
      container.dispatchEvent(new InputEvent('input', { bubbles: true }))
      close()
    },
    [close, containerRef]
  )

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>): boolean => {
      if (!trigger) return false
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex((i) =>
            items.length ? (i + 1) % items.length : 0
          )
          return true
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex((i) =>
            items.length ? (i - 1 + items.length) % items.length : 0
          )
          return true
        case 'Enter':
        case 'Tab': {
          const pick = items[highlightedIndex]
          if (!pick) {
            close()
            return false
          }
          e.preventDefault()
          commit(pick)
          return true
        }
        case 'Escape':
          e.preventDefault()
          close()
          return true
      }
      return false
    },
    [trigger, items, highlightedIndex, commit, close]
  )

  const state: MentionAutocompleteState = {
    isOpen: !!trigger,
    trigger,
    query,
    items,
    highlightedIndex,
    anchorRect,
    loading,
  }

  return {
    state,
    onInput,
    onKeyDown,
    setHighlightedIndex,
    commit,
    close,
  }
}
