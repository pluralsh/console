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
  buildChipFromAttrs,
  chipBeforeCaret,
  deleteChip,
  insertChipWithSentinels,
  serializeEditableValue,
  serializeRange,
  walkPlrlText,
} from './contentEditableChips'

export function EditableDiv({
  ref,
  initialValue,
  setValue,
  onEnter,
  onKeyDown: onKeyDownProp,
  placeholder,
  disabled,
  ...props
}: {
  initialValue?: string
  setValue: (value: string) => void
  onEnter?: () => void
  placeholder?: string
  disabled?: boolean
} & ComponentPropsWithRef<'div'>) {
  const internalRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    // sets the initial value of the div on first render
    const domNode = internalRef.current
    if (isFirstRender.current && domNode) {
      if (initialValue && initialValue !== '\n')
        domNode.innerText = initialValue
      else domNode.innerHTML = ''
    }
    isFirstRender.current = false
  }, [initialValue])

  const onInput = useCallback(
    (e: FormEvent<HTMLDivElement>) => {
      const node = e.currentTarget
      const content = serializeEditableValue(node)
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
      const range = selection.getRangeAt(0)
      const walked = walkPlrlText(text)
      const hasChip = walked.some((n) => n.type === 'chip')
      if (!hasChip) {
        range.insertNode(document.createTextNode(text))
        selection.collapseToEnd()
      } else {
        for (const w of walked) {
          if (w.type === 'chip') {
            insertChipWithSentinels(range, buildChipFromAttrs(w.tag, w.attrs))
          } else {
            const tn = document.createTextNode(w.text)
            range.insertNode(tn)
            range.setStartAfter(tn)
            range.collapse(true)
          }
        }
      }
      const node = internalRef.current
      setValue(node ? serializeEditableValue(node) : '')
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
    '[data-chip="true"]': {
      display: 'inline-flex',
      alignItems: 'center',
      gap: theme.spacing.xxsmall,
      padding: `0 ${theme.spacing.xsmall}px`,
      margin: `0 1px`,
      borderRadius: theme.borderRadiuses.medium,
      background: theme.colors['fill-three'],
      border: theme.borders['fill-three'],
      color: theme.colors.text,
      fontSize: '0.92em',
      lineHeight: '1.6em',
      verticalAlign: 'baseline',
      userSelect: 'none',
      cursor: 'default',
    },
  })
)
