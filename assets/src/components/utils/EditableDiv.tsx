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
  chipBeforeCaret,
  deleteChip,
  serializeEditableValue,
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
      const text = e.clipboardData?.getData('text/plain')
      // take the current selection, remove whatever's there if anything, and insert the pasted text
      const selection = document.getSelection()
      if (!selection?.rangeCount || !text) return
      selection.deleteFromDocument()
      selection.getRangeAt(0).insertNode(document.createTextNode(text))
      selection.collapseToEnd()
      const node = internalRef.current
      setValue(node ? serializeEditableValue(node) : '')
    },
    [setValue]
  )

  return (
    <ContentEditableDivSC
      ref={(node) => applyNodeToRefs([internalRef, ref], node)}
      contentEditable={!disabled}
      data-placeholder={placeholder}
      onInput={onInput}
      onPaste={onPaste}
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
