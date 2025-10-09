import {
  type ComponentProps,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type RefObject,
  cloneElement,
  useRef,
  useState,
} from 'react'
import { HiddenSelect, useButton, useSelect } from 'react-aria'
import styled, { useTheme } from 'styled-components'
import { type AriaSelectProps } from '@react-types/select'

import { type Placement } from '@floating-ui/react-dom-interactions'

import { type Key } from '@react-types/shared'

import {
  type BimodalSelectProps,
  type BimodalSelectState,
  useBimodalSelectState,
} from '../utils/useBimodalSelectState'

import { useFloatingDropdown } from '../hooks/useFloatingDropdown'

import { type ListBoxItemBaseProps } from './ListBoxItem'
import DropdownArrowIcon from './icons/DropdownArrowIcon'
import { PopoverListBox } from './PopoverListBox'
import {
  setNextFocusedKey,
  useSelectComboStateProps,
} from './SelectComboShared'
import { type FillLevel, useFillLevel } from './contexts/FillLevelContext'

const parentFillLevelToBackground = {
  0: 'fill-one',
  1: 'fill-two',
  2: 'fill-three',
  3: 'fill-three',
} as const satisfies Record<FillLevel, string>

type Size = 'small' | 'medium' | 'large'

type SelectButtonProps = {
  titleContent?: ReactNode
  leftContent?: ReactNode
  rightContent?: ReactNode
  children?: ReactNode
  showArrow?: boolean
  isOpen?: boolean
  size?: Size
  transparent?: boolean
  isDisabled?: boolean
}

export type SelectProps = Exclude<SelectButtonProps, 'children'> & {
  children:
    | ReactElement<ListBoxItemBaseProps>
    | ReactElement<ListBoxItemBaseProps>[]
  dropdownHeaderFixed?: ReactNode
  dropdownFooterFixed?: ReactNode
  dropdownHeader?: ReactElement<any>
  dropdownFooter?: ReactElement<any>
  onHeaderClick?: () => unknown
  onFooterClick?: () => unknown
  titleContent?: ReactNode
  triggerButton?: ReactElement<any>
  placement?: Placement
  size?: Size
  width?: string | number
  maxHeight?: string | number
  onSelectionChange?: (arg: any) => any
} & Omit<
    BimodalSelectProps<object>,
    'autoFocus' | 'onLoadMore' | 'isLoading' | 'validationState' | 'placeholder'
  >

type TriggerProps = {
  buttonRef: RefObject<HTMLElement | null>
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
    ...(buttonElt?.props?.type ? { type: buttonElt.props.type } : {}),
    isOpen,
    style: {
      appearance: 'unset',
      ...(isOpen ? { zIndex: theme.zIndexes.tooltip + 1 } : {}),
    },
    tabIndex: 0,
  })
}

export const TitleContent = styled.div<{
  $size: Size
  $parentFillLevel: FillLevel
}>(({ theme, $size: size, $parentFillLevel: parentFillLevel }) => {
  const hPad = theme.spacing.small
  const vPad = size === 'small' ? 5 : 9

  return {
    ...theme.partials.text.caption,
    alignItems: 'center',
    backgroundColor: theme.colors[parentFillLevelToBackground[parentFillLevel]],
    color: theme.colors.text,
    display: 'flex',
    flexDirection: 'row',
    fontWeight: 600,
    // Must specify individual padding to override Honorable styles on <Input>
    paddingTop: vPad,
    paddingBottom: vPad,
    paddingLeft: hPad,
    paddingRight: hPad,
    borderRight: theme.borders.input,
  }
})

const SelectButtonInner = styled.div<{
  $isOpen: boolean
  $size: Size
  $parentFillLevel: FillLevel
  $transparent?: boolean
  $isDisabled?: boolean
}>(
  ({
    theme,
    $isOpen: isOpen,
    $size: size,
    $parentFillLevel: parentFillLevel,
    $transparent: transparent = false,
    $isDisabled: isDisabled = false,
  }) => ({
    ...theme.partials.reset.button,
    ...theme.partials.text.body2,
    backgroundColor: transparent
      ? 'transparent'
      : theme.colors[parentFillLevelToBackground[parentFillLevel]],
    display: 'flex',
    flexDirection: 'row',
    flexShrink: 1,
    width: '100%',
    color: theme.colors['text-light'],
    border: theme.borders.input,
    borderRadius: theme.borderRadiuses.medium,
    overflow: 'hidden',
    '.content': {
      alignItems: 'center',
      display: 'flex',
      flexDirection: 'row',
      flexShrink: 1,
      padding: `${size === 'medium' ? 9 : 5}px ${theme.spacing.medium}px`,
      width: '100%',
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
    },
    '&:focus-visible': {
      ...theme.partials.focus.default,
    },
    '&:hover': {
      color: theme.colors.text,
      cursor: 'pointer',
    },
    ...(isDisabled && {
      borderColor: theme.colors['border-disabled'],
      color: theme.colors['text-input-disabled'],
      cursor: 'not-allowed',

      '&:hover': {
        borderColor: theme.colors['border-disabled'],
        color: theme.colors['text-input-disabled'],
      },
    }),
  })
)

function SelectButton({
  ref,
  titleContent,
  leftContent,
  rightContent,
  children,
  showArrow = true,
  isOpen,
  size = 'medium',
  transparent = false,
  isDisabled,
  ...props
}: SelectButtonProps & ComponentProps<'div'>) {
  const parentFillLevel = useFillLevel()

  return (
    <SelectButtonInner
      ref={ref}
      $isOpen={isOpen}
      $size={size}
      $parentFillLevel={parentFillLevel}
      $transparent={transparent}
      $isDisabled={isDisabled}
      {...props}
    >
      {titleContent && (
        <TitleContent
          $size={size}
          $parentFillLevel={parentFillLevel}
        >
          {titleContent}
        </TitleContent>
      )}
      <div className="content">
        {leftContent && <div className="leftContent">{leftContent}</div>}
        <div className="children">{children}</div>
        {rightContent && <div className="rightContent">{rightContent}</div>}
        {showArrow && (
          <div className="arrow">
            <DropdownArrowIcon size={16} />
          </div>
        )}
      </div>
    </SelectButtonInner>
  )
}

const SelectInner = styled.div((_) => ({
  position: 'relative',
}))

export type SelectPropsSingle = Omit<
  SelectProps,
  'selectionMode' | 'selectedKeys' | 'onSelectionChange'
> & {
  selectionMode?: 'single'
} & Pick<AriaSelectProps<object>, 'onSelectionChange'>

export type SelectPropsMultiple = Omit<
  SelectProps,
  'selectionMode' | 'selectedKey' | 'onSelectionChange'
> & {
  selectionMode: 'multiple'
} & { onSelectionChange: (keys: Set<Key>) => any }

function Select(props: SelectPropsSingle): ReactElement<any>
function Select(props: SelectPropsMultiple): ReactElement<any>
function Select({
  children,
  selectedKey,
  onSelectionChange,
  isOpen,
  onOpenChange,
  titleContent,
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
  size = 'medium',
  width,
  maxHeight,
  transparent = false,
  ...props
}: SelectProps) {
  const stateRef = useRef<BimodalSelectState<object> | null>(null)
  const [isOpenUncontrolled, setIsOpen] = useState(false)
  const nextFocusedKeyRef = useRef<Key>(null)

  if (typeof isOpen !== 'boolean') {
    isOpen = isOpenUncontrolled
  }
  if (props.selectionMode === 'multiple' && selectedKey) {
    throw new Error(
      'When using selectionMode="multiple", you must use "selectedKeys" instead of "selectedKey"'
    )
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

  const selectStateProps: BimodalSelectProps<object> = {
    ...selectStateBaseProps,
    isOpen,
    defaultOpen: false,
    selectedKey,
    label,
    ...props,
  }

  const state = useBimodalSelectState(selectStateProps)

  setNextFocusedKey({ nextFocusedKeyRef, state, stateRef })

  // Get props for the listbox element
  const ref = useRef(undefined)
  const { triggerProps, menuProps } = useSelect(selectStateProps, state, ref)

  label = label || ' '
  triggerButton = triggerButton || (
    <SelectButton
      className="triggerButton"
      titleContent={titleContent}
      leftContent={leftContent}
      rightContent={rightContent}
      isOpen={state.isOpen}
      size={size}
      transparent={transparent}
      isDisabled={props.isDisabled}
    >
      {(props.selectionMode === 'multiple' &&
        state.selectedItems.length > 0 &&
        state.selectedItems
          .map((item) => item?.props?.children?.props?.label)
          .filter((label) => !!label)
          .join(', ')) ||
        state.selectedItem?.props?.children?.props?.label ||
        label}
    </SelectButton>
  )

  const { floating, triggerRef } = useFloatingDropdown({
    triggerRef: ref,
    width,
    maxHeight,
    placement,
  })

  return (
    <SelectInner
      className="selectInner"
      onKeyDown={(e) => {
        e.stopPropagation()
      }}
    >
      <div
        aria-hidden="true"
        css={{
          // CAN BREAK TABLE VIRTUALIZATION WITHOUT THIS
          // react aria changed this to 'fixed' here https://github.com/adobe/react-spectrum/commit/a98c2a5ef8e0ad971cc98025faf30b81bd5fd42f
          // but since our tables calculate the range of all children for row height, that change made every measurement start from the top of the page in some cases
          '& > *': { position: 'absolute !important' },
        }}
      >
        <HiddenSelect
          state={state}
          triggerRef={ref}
          label={label}
          name={name}
        />
      </div>
      <Trigger
        buttonRef={triggerRef as unknown as RefObject<HTMLElement | null>}
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
        floating={floating}
      />
    </SelectInner>
  )
}

export {
  Select,
  SelectButton,
  SelectButtonInner,
  SelectInner,
  setNextFocusedKey,
}
