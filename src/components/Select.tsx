import {
  HTMLAttributes,
  Key,
  ReactElement,
  ReactNode,
  RefObject,
  cloneElement,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from 'react'
import { HiddenSelect, useSelect } from '@react-aria/select'
import { useSelectState } from '@react-stately/select'
import { AriaSelectProps } from '@react-types/select'
import { useButton } from '@react-aria/button'
import { ListState } from '@react-stately/list'

import styled, { useTheme } from 'styled-components'
import { useTransition } from 'react-spring'

import { ListBoxItemBaseProps } from './ListBoxItem'
import {
  FOOTER_KEY,
  HEADER_KEY,
  ListBoxUnmanaged,
  useItemWrappedChildren,
} from './ListBox'
import { SelectPopover } from './SelectPopover'
import DropdownArrowIcon from './icons/DropdownArrowIcon'

type SelectButtonProps = {
  leftContent?: ReactNode
  rightContent?: ReactNode
  children?: ReactNode
  showArrow?: boolean
  isOpen?: boolean
}

type Placement = 'left' | 'right'

type SelectProps = Exclude<SelectButtonProps, 'children'> & {
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

export const SelectButtonInner = styled.div<{ isOpen: boolean }>(({ theme, isOpen }) => ({
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
    ...(isOpen
      ? {
        transform: 'scaleY(-100%)',
      }
      : {}),
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
  openIsComplete: boolean
  width: string | number
  maxHeight: string | number
  placement: Placement
}>(({
  theme, width, maxHeight, placement, openIsComplete,
}) => ({
  position: 'relative',
  '.popoverWrapper': {
    position: 'absolute',
    width: width || '100%',
    ...(placement === 'right' && { right: 0, left: 'auto' }),
    ...(!openIsComplete && {
      clipPath: 'polygon(-100px 0, -100px 99999px, 99999px 99999px, 99999px 0)',
    }),
    pointerEvents: 'none',
    zIndex: theme.zIndexes.selectPopover,
  },
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
  const nextFocusedKeyRef = useRef<Key>(null)
  const stateRef = useRef<ListState<object> | null>(null)
  const [isOpenUncontrolled, setIsOpen] = useState(false)
  const [openIsComplete, setOpenIsComplete] = useState(false)
  const [isOpenWithDelay, setIsOpenWithDelay] = useState(false)
  const temporarilyPreventClose = useRef(false)
  const theme = useTheme()

  if (typeof isOpen !== 'boolean') {
    isOpen = isOpenUncontrolled
  }
  useEffect(() => {
    if (isOpen !== isOpenWithDelay) {
      setIsOpenWithDelay(isOpen)
    }
    if (!isOpen && openIsComplete) {
      setOpenIsComplete(false)
    }
  }, [isOpen, isOpenWithDelay, openIsComplete])

  const selectStateProps: AriaSelectProps<object> = {
    onOpenChange: open => {
      if (!open && temporarilyPreventClose.current) {
        temporarilyPreventClose.current = false

        return
      }
      setIsOpen(open)
      if (onOpenChange) {
        onOpenChange(open)
      }
    },
    isOpen,
    defaultOpen: false,
    selectedKey,
    onSelectionChange: newKey => {
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
        onSelectionChange(typeof newKey === 'string' ? newKey : '')
      }
    },
    label,
    children: useItemWrappedChildren(children, dropdownHeader, dropdownFooter),
    ...props,
  }

  const state = useSelectState(selectStateProps)

  stateRef.current = state

  if (nextFocusedKeyRef.current) {
    const focusedKey
      = state.collection.getKeyAfter(nextFocusedKeyRef.current)
      || nextFocusedKeyRef.current

    state.selectionManager.setFocusedKey(focusedKey)
    nextFocusedKeyRef.current = null
  }

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

  const transitions = useTransition(isOpenWithDelay, {
    from: { opacity: 0, translateY: '-150px' },
    enter: { opacity: 1, translateY: '0' },
    leave: { opacity: 0, translateY: '-150px' },
    onRest: () => {
      if (state.isOpen) {
        setOpenIsComplete(true)
      }
    },
    config: isOpenWithDelay
      ? {
        mass: 0.6,
        tension: 280,
        velocity: 0.02,
      }
      : {
        mass: 0.6,
        tension: 400,
        velocity: 0.02,
        restVelocity: 0.1,
      },
  })

  return (
    <SelectInner
      isOpen={state.isOpen}
      openIsComplete={openIsComplete}
      width={width}
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
      <div className="popoverWrapper">
        {transitions((styles, item) => item && (
          <SelectPopover
            isOpen={state.isOpen}
            onClose={state.close}
            animatedStyles={styles}
          >
            <ListBoxUnmanaged
              className="listBox"
              state={state}
              header={dropdownHeader}
              footer={dropdownFooter}
              headerFixed={dropdownHeaderFixed}
              footerFixed={dropdownFooterFixed}
              extendStyle={{
                boxShadow: theme.boxShadows.moderate,
              }}
              {...menuProps}
            />
          </SelectPopover>
        ))}
      </div>
    </SelectInner>
  )
}

export { Select, SelectButton }
