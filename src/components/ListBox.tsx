import {
  Children,
  type ComponentPropsWithRef,
  type Key,
  type ReactElement,
  type ReactNode,
  type RefObject,
  cloneElement,
  useMemo,
  useRef,
} from 'react'
import {
  type AriaListBoxOptions,
  useListBox,
  useOption,
} from '@react-aria/listbox'
import { type ListState, useListState } from '@react-stately/list'
import { mergeProps } from '@react-aria/utils'
import { type AriaListBoxProps } from '@react-types/listbox'
import { mergeRefs } from 'react-merge-refs'
import styled, { type CSSObject, useTheme } from 'styled-components'

import { Item } from '@react-stately/collections'

import Card from './Card'
import { type FillLevel } from './contexts/FillLevelContext'

export const HEADER_KEY = '$$header$$'
export const FOOTER_KEY = '$$footer$$'

type ListBoxUnmanagedProps = AriaListBoxOptions<object> &
  ComponentPropsWithRef<'div'> & {
    state: ListState<object>
    headerFixed?: ReactNode
    footerFixed?: ReactNode
    extendStyle?: CSSObject
    listBoxRef?: RefObject<any>
  }

type ListBoxProps = Omit<
  ListBoxUnmanagedProps,
  'state' | 'nextFocusedKeyRef' | 'onSelectionChange'
> & {
  selectedKey: Key
  onSelectionChange: (key: Key) => unknown
  onHeaderClick?: () => unknown
  onFooterClick?: () => unknown
  disallowEmptySelection?: boolean
  children: ReactElement | ReactElement[]
  header?: ReactElement
  footer?: ReactElement
}

const CARD_FILL_LEVEL: FillLevel = 2

const ListBoxCard = styled(Card).attrs(() => ({
  cornerSize: 'medium',
  fillLevel: CARD_FILL_LEVEL,
}))((_p) => ({
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 1,
  overflowX: 'visible',
  overflowY: 'hidden',
}))

type ScrollContainerProps = {
  extendStyle?: CSSObject
}
const ScrollContainer = styled.div<ScrollContainerProps>(
  ({ theme, extendStyle }) => ({
    ...theme.partials.scrollBar({ fillLevel: CARD_FILL_LEVEL }),
    position: 'relative',
    overflow: 'auto',
    flexShrink: 1,
    flexGrow: 1,
    '&:focus': {
      outline: 'none',
    },
    '&:focus-visible::after': {
      ...theme.partials.focus.insetAbsolute,
    },
    ...extendStyle,
  })
)

function useItemWrappedChildren(
  children: ReactElement | ReactElement[],
  header?: ReactElement,
  footer?: ReactElement
) {
  return useMemo(() => {
    // Children.map() prefixes the key props in an undocumented and possibly
    // unstable way, so using Children.forEach() to maintain original key values
    const wrapped: JSX.Element[] = []

    if (header) {
      wrapped.push(<Item key={HEADER_KEY}>{header}</Item>)
    }
    Children.forEach(children, (child) => {
      const { textValue, ...childProps } = child?.props || {}

      if (child) {
        const item = (
          <Item
            key={child.key}
            textValue={textValue || ''}
          >
            {cloneElement(child, childProps)}
          </Item>
        )

        wrapped.push(item)
      }
    })

    if (footer) {
      wrapped.push(<Item key={FOOTER_KEY}>{footer}</Item>)
    }

    return wrapped
  }, [children, header, footer])
}

function ListBox({
  disallowEmptySelection,
  selectedKey,
  children,
  header,
  footer,
  onSelectionChange,
  onHeaderClick,
  onFooterClick,
  ...props
}: ListBoxProps) {
  const nextFocusedKeyRef = useRef<Key>(null)
  const stateRef = useRef<ListState<object> | null>(null)
  const selected = useMemo(
    () => new Set(selectedKey ? [selectedKey] : null),
    [selectedKey]
  )
  const listStateProps: AriaListBoxProps<string> = {
    disallowEmptySelection,
    selectionMode: 'single',
    selectedKeys: selected,
    onSelectionChange: (selection) => {
      const [newKey] = selection

      if (newKey === HEADER_KEY && onHeaderClick) {
        onHeaderClick()
      } else if (newKey === FOOTER_KEY && onFooterClick) {
        onFooterClick()
        if (stateRef.current) {
          nextFocusedKeyRef.current =
            stateRef?.current?.collection?.getKeyBefore(FOOTER_KEY)
        }
      } else if (onSelectionChange) {
        onSelectionChange(newKey)
      }
    },
    children: useItemWrappedChildren(children, header, footer),
  }

  const state = useListState(listStateProps as any)

  stateRef.current = state

  if (nextFocusedKeyRef.current) {
    const focusedKey =
      state.collection.getKeyAfter(nextFocusedKeyRef.current) ||
      nextFocusedKeyRef.current

    state.selectionManager.setFocusedKey(focusedKey)
    nextFocusedKeyRef.current = null
  }

  return (
    <ListBoxUnmanaged
      state={state}
      {...props}
    />
  )
}

function ListBoxUnmanaged({
  state,
  headerFixed,
  footerFixed,
  extendStyle,
  className,
  listBoxRef,
  ...props
}: ListBoxUnmanagedProps) {
  const theme = useTheme()

  // Get props for the listbox element
  let ref = useRef()

  if (listBoxRef) {
    ref = listBoxRef
  }
  const { listBoxProps } = useListBox(props, state, ref)

  return (
    <ListBoxCard
      className={`listBox ${className || ''}`}
      {...extendStyle}
      {...props}
    >
      {headerFixed && <div className="headerFixed">{headerFixed}</div>}
      <ScrollContainer
        ref={ref}
        extendStyle={{
          paddingTop: headerFixed ? 0 : theme.spacing.xxxsmall,
          paddingBottom: footerFixed ? 0 : theme.spacing.xxxsmall,
        }}
        {...listBoxProps}
      >
        {[...state.collection].map((item) => (
          <Option
            key={item.key}
            item={item}
            state={state}
          />
        ))}
      </ScrollContainer>
      {footerFixed && <div className="footerFixed">{footerFixed}</div>}
    </ListBoxCard>
  )
}

function Option({ item, state }: any) {
  // Get props for the option element
  const ref = useRef()
  const {
    optionProps,
    isSelected,
    isDisabled,
    labelProps,
    descriptionProps,
    isFocused,
  } = useOption({ key: item.key }, state, ref)

  const mergedProps = mergeProps(optionProps, {
    selected: isSelected || item?.rendered?.props?.selected,
    disabled: isDisabled || item?.rendered?.props?.disabled,
    focused: isFocused,
    labelProps,
    descriptionProps,
    ref: mergeRefs([ref, item.rendered.ref]),
  })

  return cloneElement(item.rendered, mergedProps)
}

export type { ListBoxProps, ListBoxUnmanagedProps }
export { ListBox, ListBoxUnmanaged, useItemWrappedChildren }
