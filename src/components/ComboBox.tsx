import {
  type HTMLAttributes,
  type Key,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useComboBox } from '@react-aria/combobox'
import {
  type ComboBoxState,
  type ComboBoxStateOptions,
  useComboBoxState,
} from '@react-stately/combobox'
import { type AriaButtonProps, useButton } from '@react-aria/button'
import pick from 'lodash/pick'
import omit from 'lodash/omit'
import isUndefined from 'lodash/isUndefined'
import styled, { useTheme } from 'styled-components'
import { ExtendTheme, mergeTheme } from 'honorable'

import { omitBy } from 'lodash'

import { mergeRefs } from 'react-merge-refs'

import { type ListBoxItemBaseProps } from './ListBoxItem'
import DropdownArrowIcon from './icons/DropdownArrowIcon'
import Input, { type InputProps } from './Input'
import {
  setNextFocusedKey,
  useSelectComboStateProps,
} from './SelectComboShared'
import { PopoverListBox } from './PopoverListBox'
import SearchIcon from './icons/SearchIcon'
import { SelectInner } from './Select'
import { useFloatingDropdown } from './useFloatingDropdown'

type Placement = 'left' | 'right'

type ComboBoxProps = Exclude<ComboBoxInputProps, 'children'> & {
  children:
    | ReactElement<ListBoxItemBaseProps>
    | ReactElement<ListBoxItemBaseProps>[]
  dropdownHeaderFixed?: ReactNode
  dropdownFooterFixed?: ReactNode
  dropdownHeader?: ReactElement
  dropdownFooter?: ReactElement
  onHeaderClick?: () => unknown
  onFooterClick?: () => unknown
  startIcon?: ReactNode
  placement?: Placement
  width?: string | number
  maxHeight?: string | number
  inputProps?: InputProps
  filter?: ComboBoxStateOptions<object>['defaultFilter']
} & Omit<
    ComboBoxStateOptions<object>,
    'onLoadMore' | 'isLoading' | 'validationState' | 'placeholder'
  >

export const ComboBoxInputInner = styled.div<{ isOpen: boolean }>(
  ({ theme, isOpen }) => ({
    '.arrow': {
      transition: 'transform 0.1s ease',
      display: 'flex',
      marginLeft: theme.spacing.medium,
      alignItems: 'center',
      ...(isOpen
        ? {
            transform: 'scaleY(-100%)',
          }
        : {}),
    },
  })
)

type ComboBoxInputProps = {
  showArrow?: boolean
  isOpen?: boolean
  outerInputProps?: InputProps
  onInputClick?: MouseEventHandler
  inputRef?: RefObject<HTMLInputElement>
  buttonRef?: RefObject<HTMLDivElement>
  buttonProps?: AriaButtonProps
}

const OpenButton = styled(
  ({
    isOpen: _isOpen,
    buttonRef,
    buttonProps,
    ...props
  }: HTMLAttributes<HTMLDivElement> & {
    isOpen?: boolean
    buttonRef: RefObject<any>
    buttonProps: AriaButtonProps
  }) => {
    const { buttonProps: useButtonProps } = useButton(
      { ...buttonProps, elementType: 'div' },
      buttonRef
    )

    return (
      <div
        ref={buttonRef}
        {...props}
        {...useButtonProps}
      >
        <DropdownArrowIcon />
      </div>
    )
  }
)(({ theme, isOpen }) => ({
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  paddingLeft: theme.spacing.medium,
  paddingRight: theme.spacing.medium,
  ...theme.partials.dropdown.arrowTransition({ isOpen }),
}))

const StartIconButton = styled.div(({ theme }) => ({
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  paddingLeft: theme.spacing.medium,
  paddingRight: theme.spacing.medium,
}))

const comboBoxLeftRightStyles = {
  alignSelf: 'stretch',
  paddingHorizontal: 0,
  marginLeft: 0,
  marginRight: 0,
}

const honorableInputPropNames = [
  'onChange',
  'onFocus',
  'onBlur',
  'onKeyDown',
  'onKeyUp',
]

function ComboBoxInput({
  startIcon,
  children: _children,
  inputRef,
  inputProps,
  outerInputProps,
  buttonRef,
  buttonProps,
  showArrow = true,
  isOpen,
  onInputClick,
}: ComboBoxInputProps & InputProps) {
  outerInputProps = {
    ...outerInputProps,
    ...(pick(inputProps, honorableInputPropNames) as Pick<
      typeof inputProps,
      'onChange' | 'onFocus' | 'onBlur' | 'onKeyDown' | 'onKeyUp'
    >),
  }
  const theme = useTheme()
  // Need to filter out undefined properties so they won't override
  // outerInputProps for honorable <Input> component
  const innerInputProps = useMemo(
    () => omitBy(omit(inputProps, honorableInputPropNames), isUndefined),
    [inputProps]
  )

  let themeExtension: any = {}

  if (startIcon) {
    themeExtension = mergeTheme(themeExtension, {
      Input: {
        Root: [
          {
            position: 'relative',
            paddingLeft: 0,
          },
        ],
        InputBase: [{ paddingLeft: theme.spacing.xxlarge }],
        StartIcon: [
          {
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            pointerEvents: 'none',
          },
        ],
      },
    })
  }

  if (showArrow) {
    themeExtension = mergeTheme(themeExtension, {
      Input: {
        Root: [{ paddingRight: 0 }],
        EndIcon: [
          {
            ...comboBoxLeftRightStyles,
          },
        ],
      },
    })
  }

  return (
    <ExtendTheme theme={themeExtension}>
      <Input
        startIcon={startIcon && <StartIconButton>{startIcon}</StartIconButton>}
        endIcon={
          showArrow ? (
            <OpenButton
              isOpen={isOpen}
              buttonRef={buttonRef}
              buttonProps={buttonProps}
            />
          ) : undefined
        }
        inputProps={{
          ref: inputRef,
          onClick: onInputClick,
          ...innerInputProps,
        }}
        {...outerInputProps}
      />
    </ExtendTheme>
  )
}

const ComboBoxInner = styled(SelectInner)((_p) => ({}))

function ComboBox({
  children,
  selectedKey,
  inputValue,
  onSelectionChange,
  onFocusChange,
  onOpenChange,
  onInputChange,
  isOpen,
  dropdownHeader,
  dropdownFooter,
  dropdownHeaderFixed,
  dropdownFooterFixed,
  onHeaderClick,
  onFooterClick,
  showArrow,
  startIcon,
  placement,
  width,
  maxHeight,
  inputProps: outerInputProps = {},
  ...props
}: ComboBoxProps) {
  const nextFocusedKeyRef = useRef<Key>(null)
  const stateRef = useRef<ComboBoxState<object> | null>(null)
  const [isOpenUncontrolled, setIsOpenUncontrolled] = useState(false)
  const previousInputValue = useRef(inputValue)

  if (typeof isOpen !== 'boolean') {
    isOpen = isOpenUncontrolled
  }

  const wrappedOnOpenChange: typeof onOpenChange = useCallback(
    (nextIsOpen, menuTrigger) => {
      setIsOpenUncontrolled(nextIsOpen)
      if (nextIsOpen !== isOpen) {
        if (onOpenChange) onOpenChange(nextIsOpen, menuTrigger)
      }
    },
    [isOpen, onOpenChange]
  )

  const setIsOpen = useCallback(
    (isOpen: boolean) => {
      wrappedOnOpenChange(isOpen, 'manual')
    },
    [wrappedOnOpenChange]
  )

  const wrappedOnSelectionChange: typeof onSelectionChange = useCallback(
    (newKey, ...args) => {
      if (onSelectionChange) {
        onSelectionChange.apply(this, [
          typeof newKey === 'string' ? newKey : '',
          ...args,
        ])
        setIsOpen(false)
      }
    },
    [onSelectionChange, setIsOpen]
  )

  const wrappedOnFocusChange: typeof onFocusChange = useCallback(
    (isFocused, ...args) => {
      // Enforce open on focus
      if (isFocused && !isOpen) {
        setIsOpen(true)
      }
      if (onFocusChange) {
        onFocusChange(isFocused, ...args)
      }
    },
    [isOpen, onFocusChange, setIsOpen]
  )

  const wrappedOnInputChange: typeof onInputChange = useCallback(
    (input, ...args) => {
      if (input !== previousInputValue.current) {
        previousInputValue.current = input
        setIsOpen(true)
      }
      if (onInputChange) {
        onInputChange(input, ...args)
      }
    },
    [onInputChange, setIsOpen]
  )

  const comboStateBaseProps = useSelectComboStateProps<ComboBoxProps>({
    dropdownHeader,
    dropdownFooter,
    onFooterClick,
    onHeaderClick,
    onOpenChange: wrappedOnOpenChange,
    onSelectionChange: wrappedOnSelectionChange,
    children,
    setIsOpen,
    stateRef,
    nextFocusedKeyRef,
  })

  const comboStateProps: ComboBoxStateOptions<object> = {
    ...comboStateBaseProps,
    menuTrigger: 'manual',
    selectedKey: selectedKey || null,
    onFocusChange: wrappedOnFocusChange,
    onInputChange: wrappedOnInputChange,
    inputValue,
    ...props,
  }

  const state = useComboBoxState({
    ...comboStateProps,
  })

  setNextFocusedKey({ nextFocusedKeyRef, state, stateRef })

  useEffect(() => {
    if (isOpen !== state.isOpen) {
      if (isOpen) {
        state.open(null, 'manual')
      } else {
        state.close()
      }
    }
  }, [state, isOpen])

  const buttonRef = useRef(null)
  const inputRef = useRef(null)
  const listBoxRef = useRef(null)
  const popoverRef = useRef(null)

  const { buttonProps, inputProps, listBoxProps } = useComboBox(
    {
      ...comboStateProps,
      inputRef,
      buttonRef,
      listBoxRef,
      popoverRef,
    },
    state
  )

  if (startIcon === undefined) {
    startIcon = <SearchIcon />
  }

  const { floating, triggerRef } = useFloatingDropdown({
    triggerRef: inputRef,
    width,
    maxHeight,
    placement,
  })

  outerInputProps = {
    ...outerInputProps,
    ...(outerInputProps.ref
      ? { ref: mergeRefs([outerInputProps.ref, triggerRef]) }
      : { ref: triggerRef }),
  }

  return (
    <ComboBoxInner>
      <ComboBoxInput
        inputProps={inputProps}
        buttonRef={buttonRef}
        buttonProps={buttonProps}
        showArrow={showArrow}
        isOpen={state.isOpen}
        setIsOpen={setIsOpen}
        startIcon={startIcon}
        outerInputProps={outerInputProps}
        onInputClick={() => {
          setIsOpen(true)
          // Need to also manually open with state to override
          // default close behavior
          state.open(null, 'manual')
        }}
      />
      <PopoverListBox
        isOpen={state.isOpen}
        onClose={state.close}
        listBoxState={state}
        listBoxProps={listBoxProps}
        popoverRef={popoverRef}
        listBoxRef={listBoxRef}
        dropdownHeaderFixed={dropdownHeaderFixed}
        dropdownFooterFixed={dropdownFooterFixed}
        width={width}
        floating={floating}
      />
    </ComboBoxInner>
  )
}

export type { ComboBoxProps }
export { ComboBox }
