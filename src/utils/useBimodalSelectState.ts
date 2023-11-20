/*
Modified from:
https://github.com/adobe/react-spectrum/blob/main/packages/%40react-stately/select/src/useSelectState.ts
*/

/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { useFormValidationState } from '@react-stately/form'
import { useMenuTriggerState } from 'react-stately'
import { type AriaSelectProps } from '@react-types/select'
import { type ListProps, type SelectState, useListState } from 'react-stately'
import { type Key, useCallback, useRef, useState } from 'react'
import { useControlledState } from '@react-stately/utils'
import { type Node } from '@react-types/shared'

export type BimodalSelectState<T = object> = SelectState<T> & {
  selectedKeys: Set<Key>
  setSelectedKeys: any
  selectedItems: Node<T>[]
}

export type BimodalSelectProps<T> = Omit<
  AriaSelectProps<T>,
  'onSelectionChange'
> &
  Omit<ListProps<T>, 'onSelectionChange'>

/**
 * Provides state management for a select component. Handles building a collection
 * of items from props, handles the open state for the popup menu, and manages
 * multiple selection state.
 */
function useBimodalSelectState<T extends object>(
  p: BimodalSelectProps<T> & Pick<AriaSelectProps<T>, 'onSelectionChange'>
): BimodalSelectState<T>
function useBimodalSelectState<T extends object>(
  p: BimodalSelectProps<T> & Pick<ListProps<T>, 'onSelectionChange'>
): BimodalSelectState<T>
function useBimodalSelectState<T extends object>({
  selectionMode = 'single',
  onSelectionChange: onSelectChangeProp,
  ...props
}: BimodalSelectProps<T> & {
  onSelectionChange: (arg: any) => any
}): BimodalSelectState<T> {
  const [selectedKey, setSelectedKey] = useControlledState<Key>(
    selectionMode === 'single' ? props.selectedKey : undefined,
    props.defaultSelectedKey ?? null,
    selectionMode === 'single' ? onSelectChangeProp : undefined
  )
  const listStateRef = useRef<ReturnType<typeof useListState>>()
  const getAllKeys = useCallback(
    () => new Set<Key>(listStateRef.current?.collection?.getKeys() ?? []),
    []
  )
  const selectedKeys =
    selectionMode === 'multiple' ? props.selectedKeys : new Set([selectedKey])
  const triggerState = useMenuTriggerState(props)

  const onSelectionChange = useCallback<ListProps<object>['onSelectionChange']>(
    (keys) => {
      if (selectionMode === 'single' && keys !== 'all') {
        const key = keys.values().next().value

        // Always fire onSelectionChange, even if the key is the same
        // as the current key (useControlledState does not).
        if (key === selectedKey && onSelectChangeProp) {
          onSelectChangeProp(key)
        }

        setSelectedKey(key)
        triggerState.close()
      }
      if (selectionMode === 'multiple') {
        onSelectChangeProp(keys === 'all' ? getAllKeys() : keys)
      }
    },
    [
      getAllKeys,
      onSelectChangeProp,
      selectedKey,
      selectionMode,
      setSelectedKey,
      triggerState,
    ]
  )

  const listState = useListState({
    disallowEmptySelection: selectionMode === 'single',
    allowDuplicateSelectionEvents: true,
    ...props,
    selectionMode,
    selectedKeys,
    onSelectionChange,
  })

  listStateRef.current = listState

  const validationState = useFormValidationState({
    ...props,
    value: selectionMode === 'single' ? selectedKey : selectedKeys,
  })

  const selectedItem =
    selectedKey != null ? listState.collection.getItem(selectedKey) : null

  const selectedItems = Array.from(selectedKeys).map((key) =>
    listState.collection.getItem(key)
  )

  const [isFocused, setFocused] = useState(false)

  return {
    ...validationState,
    ...listState,
    ...triggerState,
    selectedKey,
    setSelectedKey,
    selectedItem,
    selectedKeys: listState.selectionManager.selectedKeys, // might not get updated every time
    selectedItems,
    setSelectedKeys: listState.selectionManager.setSelectedKeys, // might not get updated every time
    open() {
      // Don't open if the collection is empty.
      if (listState.collection.size !== 0) {
        triggerState.open()
      }
    },
    toggle(focusStrategy) {
      if (listState.collection.size !== 0) {
        triggerState.toggle(focusStrategy)
      }
    },
    isFocused,
    setFocused,
  }
}

export { useBimodalSelectState }
