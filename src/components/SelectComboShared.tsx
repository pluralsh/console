import {
  Dispatch,
  Key,
  MutableRefObject,
  RefObject,
  SetStateAction,
  useCallback,
  useRef,
} from 'react'
import { ListState } from '@react-stately/list'
import { Selection } from '@react-types/shared'
import isNil from 'lodash/isNil'

import { FOOTER_KEY, HEADER_KEY, useItemWrappedChildren } from './ListBox'
import { ComboBoxProps } from './ComboBox'
import { SelectProps } from './Select'

type TType = SelectProps | ComboBoxProps

type UseSelectComboStatePropsArgs<T extends TType> = Pick<
  T,
  | 'onSelectionChange'
  | 'onOpenChange'
  | 'dropdownHeader'
  | 'dropdownFooter'
  | 'onFooterClick'
  | 'onHeaderClick'
  | 'children'
> & {
  setIsOpen: Dispatch<SetStateAction<boolean>>
  stateRef: RefObject<ListState<object> | null>
  nextFocusedKeyRef: MutableRefObject<Key>
}

type UseSelectComboStatePropsReturn<T extends TType> = Pick<
  T,
  'children' | 'onOpenChange' | 'onSelectionChange'
>

function setDifference<T>(a: Set<T>, b: Set<T>): Set<T> {
  return new Set([...a].filter(x => !b.has(x)))
}

function useSelectComboStateProps<T extends TType>({
  setIsOpen,
  onOpenChange,
  onFooterClick,
  onHeaderClick,
  onSelectionChange,
  dropdownHeader,
  dropdownFooter,
  stateRef,
  children,
  nextFocusedKeyRef,
}: UseSelectComboStatePropsArgs<T>): UseSelectComboStatePropsReturn<T> {
  const temporarilyPreventClose = useRef(false)
  const getCurrentKeys = useCallback(() => new Set<Key>(stateRef.current?.selectionManager.selectedKeys ?? []),
    [stateRef])

  return {
    onOpenChange: (open: boolean, ...args: any[]) => {
      if (!open && temporarilyPreventClose.current) {
        temporarilyPreventClose.current = false

        return
      }
      setIsOpen(open)
      if (onOpenChange) {
        onOpenChange.apply(this, [open, ...args])
      }
    },
    onSelectionChange: (newKeyOrKeys: Key | Selection, ...args: any) => {
      let newKey: Key = ''

      if (
        typeof newKeyOrKeys === 'string'
        || typeof newKeyOrKeys === 'number'
      ) {
        newKey = newKeyOrKeys
      }
      else if (!isNil(newKeyOrKeys)) {
        const currentKeys = getCurrentKeys()
        const diff = setDifference(newKeyOrKeys, currentKeys)

        newKey = diff.keys().next().value || ''
      }
      switch (newKey) {
      case HEADER_KEY:
        temporarilyPreventClose.current = true
        onHeaderClick?.()
        break
      case FOOTER_KEY:
        temporarilyPreventClose.current = true
        onFooterClick?.()
        if (stateRef.current) {
          nextFocusedKeyRef.current
              = stateRef?.current?.collection?.getKeyBefore(FOOTER_KEY)
        }
        break
      default:
        onSelectionChange?.apply(this, [newKeyOrKeys, ...args])
        break
      }
    },
    children: useItemWrappedChildren(children, dropdownHeader, dropdownFooter),
  }
}

const setNextFocusedKey = ({
  nextFocusedKeyRef,
  state,
  stateRef,
}: {
  nextFocusedKeyRef: MutableRefObject<Key>
  state: ListState<object>
  stateRef: MutableRefObject<ListState<object>>
}) => {
  stateRef.current = state

  if (nextFocusedKeyRef.current) {
    const nextFocusedKey = nextFocusedKeyRef.current
    const focusedKey
      = state.collection.getKeyAfter(nextFocusedKey) || nextFocusedKey

    state.selectionManager.setFocusedKey(focusedKey)
    nextFocusedKeyRef.current = null
  }
}

export { useSelectComboStateProps, setNextFocusedKey, useItemWrappedChildren }
