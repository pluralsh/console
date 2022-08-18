import {
  Dispatch,
  Key,
  MutableRefObject,
  RefObject,
  SetStateAction,
  useRef,
} from 'react'
import { ListState } from '@react-stately/list'

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
    onSelectionChange: (newKey, ...args) => {
      if (newKey === HEADER_KEY && onHeaderClick) {
        temporarilyPreventClose.current = true
        onHeaderClick()
      }
      else if (newKey === FOOTER_KEY && onFooterClick) {
        temporarilyPreventClose.current = true
        onFooterClick()
        if (stateRef.current) {
          nextFocusedKeyRef.current
            = stateRef?.current?.collection?.getKeyBefore(FOOTER_KEY)
        }
      }
      else if (onSelectionChange) {
        onSelectionChange.apply(this, [
          typeof newKey === 'string' ? newKey : '',
          ...args,
        ])
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
