// should probably consider moving to something like Lexical
// if we decide to add any more complexity to this
import {
  ClipboardEvent,
  ComponentPropsWithRef,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import styled from 'styled-components'
import { applyNodeToRefs } from 'utils/applyNodeToRefs'
import {
  CHIP_DATA_ATTR,
  chipBeforeCaret,
  deleteChip,
  insertPlrlText,
  serializeEditableDiv,
  serializeRange,
} from './contentEditableChips'

export function EditableDiv({
  ref,
  initialValue,
  setValue,
  onEnter,
  onKeyDown: onKeyDownProp,
  placeholder,
  disabled,
  deserializePlrlInitialValue = false,
  ...props
}: {
  initialValue?: string
  setValue: (value: string) => void
  onEnter?: () => void
  placeholder?: string
  disabled?: boolean
  /**
   * When true, mount once parses stored `<plrl-*>` chip XML via `insertPlrlText` (workbench cron/webhook
   * prompts). Default `innerText` keeps prior behavior elsewhere (e.g. chat plain-text seeds).
   */
  deserializePlrlInitialValue?: boolean
} & ComponentPropsWithRef<'div'>) {
  const internalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const domNode = internalRef.current
    if (!domNode) return

    if (initialValue && initialValue !== '\n') {
      if (deserializePlrlInitialValue) {
        domNode.innerHTML = ''
        const range = document.createRange()
        range.selectNodeContents(domNode)
        range.collapse(true)
        insertPlrlText(range, initialValue)

        const content = serializeEditableDiv(domNode)
        setValue(content === '\n' ? '' : content)
      } else domNode.innerText = initialValue
    } else domNode.innerHTML = ''

    // One-time hydrate per editor mount — parents that load async prompts bump `syncKey` on ChatInputSimple.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialValue/`setValue` are mount snapshots only
  }, [])

  const onInput = useCallback(
    (e: FormEvent<HTMLDivElement>) => {
      const node = e.currentTarget
      const content = serializeEditableDiv(node)
      // sometimes clearing the input manually leaves a straggler newline
      setValue(content === '\n' ? '' : content)
      if (content === '\n' || content === '') node.innerHTML = ''
    },
    [setValue]
  )

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      onKeyDownProp?.(e)
      if (e.defaultPrevented) return
      // for handling enter key when onEnter callback is defined
      // if any modifier key is pressed, just allow default behavior (which is adding a new line usually)
      if (e.key === 'Enter' && onEnter) {
        if (e.shiftKey || e.ctrlKey || e.altKey) return
        e.preventDefault()
        onEnter?.()
        return
      }
      if (e.key === 'Backspace' && internalRef.current) {
        const chip = chipBeforeCaret(internalRef.current)
        if (chip) {
          e.preventDefault()
          deleteChip(chip)
          // dispatch input so React state syncs
          internalRef.current.dispatchEvent(
            new InputEvent('input', { bubbles: true })
          )
        }
      }
    },
    [onEnter, onKeyDownProp]
  )

  const onPaste = useCallback(
    (e: ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      const text = e.clipboardData?.getData('text/plain') ?? ''
      const selection = document.getSelection()
      if (!selection?.rangeCount || !text) return
      selection.deleteFromDocument()
      insertPlrlText(selection.getRangeAt(0), text)
      const node = internalRef.current
      setValue(node ? serializeEditableDiv(node) : '')
    },
    [setValue]
  )

  const onCopy = useCallback((e: ClipboardEvent<HTMLDivElement>) => {
    const sel = document.getSelection()
    if (!sel?.rangeCount || sel.isCollapsed) return
    e.clipboardData?.setData('text/plain', serializeRange(sel.getRangeAt(0)))
    e.preventDefault()
  }, [])

  const onCut = useCallback((e: ClipboardEvent<HTMLDivElement>) => {
    const sel = document.getSelection()
    if (!sel?.rangeCount || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    e.clipboardData?.setData('text/plain', serializeRange(range))
    e.preventDefault()
    range.deleteContents()
    internalRef.current?.dispatchEvent(
      new InputEvent('input', { bubbles: true })
    )
  }, [])

  // allows us to apply styles to highlighted chips
  useEffect(() => {
    const handler = () => {
      const sel = document.getSelection()
      const range = sel?.rangeCount ? sel.getRangeAt(0) : null
      internalRef.current
        ?.querySelectorAll<HTMLElement>(`[${CHIP_DATA_ATTR}="true"]`)
        .forEach((chip) =>
          range?.intersectsNode(chip)
            ? (chip.dataset.selected = 'true')
            : delete chip.dataset.selected
        )
    }
    document.addEventListener('selectionchange', handler)
    return () => document.removeEventListener('selectionchange', handler)
  }, [])

  return (
    <ContentEditableDivSC
      ref={(node) => applyNodeToRefs([internalRef, ref], node)}
      contentEditable={!disabled}
      data-placeholder={placeholder}
      onInput={onInput}
      onPaste={onPaste}
      onCopy={onCopy}
      onCut={onCut}
      onKeyDown={onKeyDown}
      $disabled={disabled}
      {...props}
    />
  )
}

const ContentEditableDivSC = styled.div<{ $disabled?: boolean }>(
  ({ theme, $disabled }) => ({
    ...theme.partials.text.body2,
    flex: 1,
    border: 'none',
    outline: 'none',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
    opacity: $disabled ? 0.5 : 1,
    cursor: $disabled ? 'not-allowed' : 'text',
    '&:empty:before': {
      content: 'attr(data-placeholder)',
      color: theme.colors['text-xlight'],
      pointerEvents: 'none',
    },
    [`[${CHIP_DATA_ATTR}="true"]`]: {
      ...theme.partials.text.caption,
      display: 'inline-flex',
      alignItems: 'center',
      gap: theme.spacing.xxsmall,
      padding: `0 ${theme.spacing.xsmall}px`,
      borderRadius: theme.borderRadiuses.medium,
      background: theme.colors['fill-two'],
      border: theme.borders['fill-two'],
      color: theme.colors['text-light'],
      lineHeight: '1.6em',
      userSelect: 'none',
      cursor: 'default',
      margin: 1,
    },
    [`[${CHIP_DATA_ATTR}][data-selected] > span`]: { background: 'Highlight' },
  })
)
