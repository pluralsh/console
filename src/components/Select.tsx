import {
  HTMLAttributes,
  Key,
  ReactElement,
  ReactNode,
  RefObject,
  cloneElement,
  forwardRef,
  useRef,
  useState,
} from 'react'
import { HiddenSelect, useSelect } from '@react-aria/select'
import { SelectState, useSelectState } from '@react-stately/select'
import { AriaSelectProps } from '@react-types/select'
import { useButton } from '@react-aria/button'
import styled, { useTheme } from 'styled-components'

import { ListBoxItemBaseProps } from './ListBoxItem'
import DropdownArrowIcon from './icons/DropdownArrowIcon'
import { PopoverListBox } from './PopoverListBox'
import { setNextFocusedKey, useSelectComboStateProps } from './SelectComboShared'

type SelectButtonProps = {
  leftContent?: ReactNode
  rightContent?: ReactNode
  children?: ReactNode
  showArrow?: boolean
  isOpen?: boolean
}

type Placement = 'left' | 'right'

export type SelectProps = Exclude<SelectButtonProps, 'children'> & {
  children:
    | ReactElement<ListBoxItemBaseProps>
    | ReactElement<ListBoxItemBaseProps>[]
  dropdownHeaderFixed?: ReactNode
  dropdownFooterFixed?: ReactNode
  dropdownHeader?: ReactElement
  dropdownFooter?: ReactElement
  onHeaderClick?: () => unknown
  onFooterClick?: () => unknown
  triggerButton?: ReactElement
  placement?: Placement
  width?: string | number
  maxHeight?: string | number
} & Omit<
    AriaSelectProps<object>,
    'autoFocus' | 'onLoadMore' | 'isLoading' | 'validationState' | 'placeholder'
  >

type TriggerProps = {
  buttonRef: RefObject<HTMLElement>
  buttonElt: any
  isOpen: boolean
} & HTMLAttributes<HTMLElement>

function Trigger({ buttonElt, isOpen, ...props }: TriggerProps) {
  const ref = props.buttonRef
  const { buttonProps } = useButton(props, ref)
  const theme = useTheme()

  return cloneElement(buttonElt, {
    ref,
    ...buttonProps,
    isOpen,
    style: {
      appearance: 'unset',
      ...(isOpen ? { zIndex: theme.zIndexes.tooltip + 1 } : {}),
    },
    tabIndex: 0,
  })
}

const SelectButtonInner = styled.div<{ isOpen: boolean }>(({ theme, isOpen }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.body2,
  display: 'flex',
  flexDirection: 'row',
  flexShrink: 1,
  alignItems: 'center',
  width: '100%',
  padding: `9px ${theme.spacing.medium}px`,
  color: theme.colors['text-light'],
  border: theme.borders.input,
  borderRadius: theme.borderRadiuses.medium,
  '.children': {
    flexGrow: 1,
  },
  '.leftContent, .rightContent': {
    display: 'flex',
    alignItems: 'center',
  },
  '.leftContent': {
    marginRight: theme.spacing.medium,
  },
  '.rightContent': {
    marginLeft: theme.spacing.medium,
  },
  '.arrow': {
    transition: 'transform 0.1s ease',
    display: 'flex',
    marginLeft: theme.spacing.medium,
    alignItems: 'center',
    ...theme.partials.dropdown.arrowTransition({ isOpen }),
  },
  '&:focus-visible': {
    ...theme.partials.focus.default,
  },
}))

const SelectButton = forwardRef<
  HTMLDivElement,
  SelectButtonProps & HTMLAttributes<HTMLDivElement>
>(({
  leftContent, rightContent, children, showArrow = true, isOpen, ...props
},
ref) => (
  <SelectButtonInner
    ref={ref}
    isOpen={isOpen}
    {...props}
  >
    {leftContent && <div className="leftContent">{leftContent}</div>}
    <div className="children">{children}</div>
    {rightContent && <div className="rightContent">{rightContent}</div>}
    {showArrow && (
      <div className="arrow">
        <DropdownArrowIcon size={16} />
      </div>
    )}
  </SelectButtonInner>
))

const SelectInner = styled.div<{
  isOpen: boolean
  maxHeight: string | number
  placement: Placement
}>(({ maxHeight, placement }) => ({
  position: 'relative',
  '.popover': {
    maxHeight: maxHeight || 230,
    width: '100%',
    ...(placement === 'right' && { right: 0, left: 'auto' }),
    pointerEvents: 'auto',
  },
}))

function Select({
  children,
  selectedKey,
  onSelectionChange,
  isOpen,
  onOpenChange,
  leftContent,
  rightContent,
  dropdownHeader,
  dropdownFooter,
  dropdownHeaderFixed,
  dropdownFooterFixed,
  onHeaderClick,
  onFooterClick,
  label,
  name,
  triggerButton,
  placement,
  width,
  maxHeight,
  ...props
}: SelectProps) {
  const stateRef = useRef<SelectState<object> | null>(null)
  const [isOpenUncontrolled, setIsOpen] = useState(false)
  const nextFocusedKeyRef = useRef<Key>(null)

  if (typeof isOpen !== 'boolean') {
    isOpen = isOpenUncontrolled
  }

  const selectStateBaseProps = useSelectComboStateProps<SelectProps>({
    dropdownHeader,
    dropdownFooter,
    onFooterClick,
    onHeaderClick,
    onOpenChange,
    onSelectionChange,
    children,
    setIsOpen,
    stateRef,
    nextFocusedKeyRef,
  })

  const selectStateProps: AriaSelectProps<object> = {
    ...selectStateBaseProps,
    isOpen,
    defaultOpen: false,
    selectedKey,
    label,
    ...props,
  }

  const state = useSelectState(selectStateProps)

  setNextFocusedKey({ nextFocusedKeyRef, state, stateRef })

  // Get props for the listbox element
  const ref = useRef()
  const { triggerProps, menuProps } = useSelect(selectStateProps, state, ref)

  label = label || ' '
  triggerButton = triggerButton || (
    <SelectButton
      className="triggerButton"
      leftContent={leftContent}
      rightContent={rightContent}
      isOpen={state.isOpen}
    >
      {state.selectedItem?.props?.children?.props?.label || label}
    </SelectButton>
  )

  return (
    <SelectInner
      isOpen={state.isOpen}
      maxHeight={maxHeight}
      placement={placement}
    >
      <HiddenSelect
        state={state}
        triggerRef={ref}
        label={label}
        name={name}
      />
      <Trigger
        buttonRef={ref}
        buttonElt={triggerButton}
        isOpen={state.isOpen}
        {...triggerProps}
      />
      <PopoverListBox
        isOpen={state.isOpen}
        onClose={state.close}
        listBoxState={state}
        listBoxProps={menuProps}
        dropdownHeaderFixed={dropdownHeaderFixed}
        dropdownFooterFixed={dropdownFooterFixed}
        width={width}
        placement={placement}
      />
    </SelectInner>
  )
}

export const PopoverWrapper = styled.div<{
  isOpen: boolean
  width: string | number
  placement: Placement
}>(({ theme, width, placement }) => ({
  position: 'absolute',
  width: width || '100%',
  ...(placement === 'right' && { right: 0, left: 'auto' }),
  pointerEvents: 'none',
  zIndex: theme.zIndexes.selectPopover,
  clipPath: 'polygon(-100px 0, -100px 99999px, 99999px 99999px, 99999px 0)',
  '&.enter-done': {
    clipPath: 'none',
  },
}))

export {
  Select,
  SelectButton,
  SelectButtonInner,
  SelectInner,
  setNextFocusedKey,
}
