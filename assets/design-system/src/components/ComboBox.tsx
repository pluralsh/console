import { omitBy } from 'lodash'
import { isEmpty, isUndefined, omit, pick } from 'lodash-es'
import {
  type ComponentProps,
  type HTMLAttributes,
  type KeyboardEvent,
  type KeyboardEventHandler,
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
import { type AriaButtonProps, useButton, useComboBox } from 'react-aria'
import { mergeRefs } from 'react-merge-refs'
import {
  type ComboBoxState,
  type ComboBoxStateOptions,
  useComboBoxState,
} from 'react-stately'
import styled, { useTheme } from 'styled-components'

import { type Key } from '@react-types/shared'

import { useFloatingDropdown } from '../hooks/useFloatingDropdown'

import DropdownArrowIcon from './icons/DropdownArrowIcon'
import SearchIcon from './icons/SearchIcon'
import { type InputProps } from './Input'
import { Spinner } from './Spinner'

import { type ListBoxItemBaseProps } from './ListBoxItem'
import { PopoverListBox } from './PopoverListBox'
import { SelectInner } from './Select'
import {
  setNextFocusedKey,
  useSelectComboStateProps,
} from './SelectComboShared'
import Input2 from './Input2'
import Chip, { CHIP_CLOSE_ATTR_KEY } from './Chip'

type Placement = 'left' | 'right'
const CHIP_ATTR_KEY = 'data-chip-key' as const

type ComboBoxProps = Exclude<ComboBoxInputProps, 'children'> & {
  children:
    | ReactElement<ListBoxItemBaseProps>
    | ReactElement<ListBoxItemBaseProps>[]
  dropdownHeaderFixed?: ReactNode
  dropdownFooterFixed?: ReactNode
  dropdownHeader?: ReactElement<any>
  dropdownFooter?: ReactElement<any>
  onHeaderClick?: () => unknown
  onFooterClick?: () => unknown
  startIcon?: ReactNode
  endIcon?: ReactNode
  placement?: Placement
  width?: string | number
  maxHeight?: string | number
  inputProps?: InputProps
  filter?: ComboBoxStateOptions<object>['defaultFilter']
  loading?: boolean
  titleContent?: ReactNode
  chips?: ComponentProps<typeof Chip>[]
  onDeleteChip?: (key: string) => void
  inputContent?: ComponentProps<typeof Input2>['inputContent']
  onDeleteInputContent?: ComponentProps<typeof Input2>['onDeleteInputContent']
  containerProps?: HTMLAttributes<HTMLDivElement>
} & Pick<InputProps, 'suffix' | 'prefix' | 'titleContent' | 'showClearButton'> &
  Omit<
    ComboBoxStateOptions<object>,
    'onLoadMore' | 'isLoading' | 'validationState' | 'placeholder'
  >

type ComboBoxInputProps = {
  showArrow?: boolean
  isOpen?: boolean
  outerInputProps?: InputProps
  onInputClick?: MouseEventHandler
  inputRef?: RefObject<HTMLInputElement | null>
  buttonRef?: RefObject<HTMLDivElement | null>
  buttonProps?: AriaButtonProps
  loading?: boolean
  hasChips?: boolean
}

const OpenButtonSC = styled.div(({ theme }) => ({
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  alignSelf: 'stretch',
  paddingLeft: theme.spacing.medium,
  paddingRight: theme.spacing.medium,
  borderRadius: theme.borderRadiuses.medium - theme.borderWidths.default,
  ...theme.partials.dropdown.arrowTransition({ isOpen: false }),
  '&[aria-expanded=true]': {
    ...theme.partials.dropdown.arrowTransition({ isOpen: true }),
  },
  '&:focus, &:focus-visible': {
    outline: 'none',
  },
}))

function OpenButton({
  buttonRef,
  buttonProps,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  buttonRef: RefObject<any>
  buttonProps: AriaButtonProps
}) {
  const { buttonProps: useButtonProps } = useButton(
    { ...buttonProps, elementType: 'div' },
    buttonRef
  )

  return (
    <OpenButtonSC
      ref={buttonRef}
      {...props}
      {...useButtonProps}
    >
      <DropdownArrowIcon />
    </OpenButtonSC>
  )
}

const InputChipList = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
}))
const onChipClick = (e: Event) => {
  e.stopPropagation()
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
  hasChips = false,
  onInputClick,
  loading,
  ...props
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

  return (
    <Input2
      startIcon={
        loading ? <Spinner color={theme.colors['icon-xlight']} /> : startIcon
      }
      dropdownButton={
        showArrow ? (
          <OpenButton
            buttonRef={buttonRef}
            buttonProps={buttonProps}
          />
        ) : undefined
      }
      inputProps={{
        ref: inputRef,
        onClick: onInputClick,
        ...innerInputProps,
        style: {
          ...(hasChips ? { minWidth: 150 } : {}),
          ...(innerInputProps?.style || {}),
        },
      }}
      {...outerInputProps}
      {...props}
    />
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
  endIcon,
  placement,
  width,
  maxHeight,
  inputProps: outerInputProps = {},
  loading,
  suffix,
  prefix,
  titleContent,
  showClearButton,
  chips,
  inputContent,
  onDeleteChip: onDeleteChipProp,
  containerProps,
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
  const inputInnerRef = useRef(null)
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

  const chipListRef = useRef<HTMLDivElement>(null)

  const onDeleteChip = useCallback(
    (key: string) => {
      const elt = chipListRef?.current?.querySelector(
        `[${CHIP_ATTR_KEY}="${CSS.escape(key)}"]`
      )
      const prevChipClose = elt?.previousElementSibling?.querySelector(
        '[data-close-button]'
      )

      if (prevChipClose instanceof HTMLElement) {
        prevChipClose.focus()
      } else {
        const nextChipClose = elt?.nextElementSibling?.querySelector(
          '[data-close-button]'
        )

        if (nextChipClose instanceof HTMLElement) {
          nextChipClose.focus?.()
        } else {
          inputRef.current?.querySelector('input')?.focus?.()
        }
      }

      onDeleteChipProp?.(key)
    },
    [onDeleteChipProp]
  )
  const handleKeyDown = useCallback<KeyboardEventHandler>((e) => {
    const elt = e.currentTarget

    const dir: 0 | 1 | -1 =
      e.code === 'ArrowLeft' ? -1 : e.code === 'ArrowRight' ? 1 : 0

    if (dir === 0) return

    if (elt === inputInnerRef.current && elt instanceof HTMLInputElement) {
      if (elt.selectionStart !== 0 || dir !== -1) {
        return
      }

      const lastChipClose = chipListRef.current?.querySelector(
        `:last-of-type[${CHIP_ATTR_KEY}] [${CHIP_CLOSE_ATTR_KEY}]`
      )

      if (lastChipClose instanceof HTMLElement) {
        lastChipClose.focus()
      }
    } else if (
      elt instanceof HTMLElement &&
      elt.contains(document.activeElement)
    ) {
      const chip = document.activeElement?.closest(`[${CHIP_ATTR_KEY}]`)

      if (dir === 1) {
        if (!chip.nextElementSibling) {
          inputInnerRef.current?.focus()
        } else {
          chip?.nextElementSibling
            ?.querySelector(`[${CHIP_CLOSE_ATTR_KEY}]`)
            // @ts-ignore
            ?.focus?.()
        }
      } else if (dir === -1) {
        chip.previousElementSibling
          ?.querySelector(`[${CHIP_CLOSE_ATTR_KEY}]`)
          // @ts-ignore
          ?.focus?.()
      }
    }
  }, [])

  outerInputProps = useMemo(
    () => ({
      inputContent: (
        <>
          {inputContent}
          {!isEmpty(chips) && (
            <InputChipList
              ref={chipListRef}
              onKeyDown={handleKeyDown}
            >
              {chips.map((chipProps) => (
                <Chip
                  fillLevel={2}
                  size="small"
                  condensed
                  truncateWidth={100}
                  truncateEdge="start"
                  closeButton
                  tooltip
                  onClick={onChipClick}
                  closeButtonProps={{
                    onClick: () => {
                      onDeleteChip?.(chipProps?.key?.toString())
                    },
                    'aria-label': `Remove ${chipProps.key}`,
                  }}
                  {...{ [CHIP_ATTR_KEY]: chipProps?.key }}
                  {...chipProps}
                />
              ))}
            </InputChipList>
          )}
        </>
      ),
      ...(onDeleteChipProp
        ? {
            onDeleteInputContent: () =>
              onDeleteChipProp?.(chips?.[chips.length - 1]?.key?.toString()),
          }
        : {}),
      ...outerInputProps,
      ...(outerInputProps.ref
        ? { ref: mergeRefs([outerInputProps.ref, triggerRef]) }
        : { ref: triggerRef }),
    }),
    [
      chips,
      handleKeyDown,
      inputContent,
      onDeleteChip,
      onDeleteChipProp,
      outerInputProps,
      triggerRef,
    ]
  )

  return (
    <ComboBoxInner {...containerProps}>
      <ComboBoxInput
        inputRef={inputInnerRef}
        inputProps={{
          ...inputProps,
          onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
            handleKeyDown(e)
            inputProps?.onKeyDown?.(e)
          },
        }}
        buttonRef={buttonRef}
        buttonProps={buttonProps}
        showArrow={showArrow}
        isOpen={state.isOpen}
        suffix={suffix}
        prefix={prefix}
        titleContent={titleContent}
        showClearButton={showClearButton}
        startIcon={startIcon}
        endIcon={endIcon}
        outerInputProps={outerInputProps}
        loading={loading}
        hasChips={!!chips}
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
