import {
  Children,
  ComponentPropsWithRef,
  Key,
  ReactElement,
  ReactNode,
  cloneElement,
  useMemo,
  useRef,
} from 'react'
import { useListBox, useOption } from '@react-aria/listbox'
import { ListState, useListState } from '@react-stately/list'
import { Item } from '@react-stately/collections'
import { useFocusRing } from '@react-aria/focus'
import { mergeProps } from '@react-aria/utils'
import { AriaListBoxProps } from '@react-types/listbox'
import { mergeRefs } from 'react-merge-refs'

import styled, { CSSObject, useTheme } from 'styled-components'

import { Card } from '../index'

export const HEADER_KEY = '$$header$$'
export const FOOTER_KEY = '$$footer$$'

type ListBoxUnmanagedProps = ComponentPropsWithRef<'div'> & {
  state: ListState<object>
  header?: ReactElement
  footer?: ReactElement
  headerFixed?: ReactNode
  footerFixed?: ReactNode
  extendStyle?: CSSObject
}

type ListBoxProps = Omit<ListBoxUnmanagedProps, 'state' | 'nextFocusedKeyRef'> & {
  selectedKey: string
  onSelectionChange: (key: string) => unknown
  onHeaderClick?: () => unknown
  onFooterClick?: () => unknown
  disallowEmptySelection?: boolean
  children: ReactElement | ReactElement[]
}

const ListBoxCard = styled(Card).attrs(() => ({
  cornerSize: 'medium',
  hue: 'lighter',
}))(_p => ({
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 1,
  overflowX: 'visible',
  overflowY: 'hidden',
}))

type ScrollContainerProps = {
  hue?: 'default' | 'lighter'
  extendStyle?: CSSObject
}
const ScrollContainer = styled.div<ScrollContainerProps>(({ theme, extendStyle }) => ({
  ...theme.partials.scrollBar({ hue: 'lighter' }),
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
}))

function useItemWrappedChildren(children: ReactElement | ReactElement[],
  header: ReactElement,
  footer: ReactElement) {
  return useMemo(() => {
    // Children.map() prefixes the key props in an undocumented and possibly
    // unstable way, so using Children.forEach() to maintain original key values
    const wrapped: JSX.Element[] = []

    if (header) {
      wrapped.push(<Item key={HEADER_KEY}>{header}</Item>)
    }
    Children.forEach(children, child => {
      if (child) {
        wrapped.push(<Item key={child.key}>{child}</Item>)
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
  const selected = useMemo(() => new Set(selectedKey ? [selectedKey] : null),
    [selectedKey])
  const listStateProps: AriaListBoxProps<string> = {
    disallowEmptySelection,
    selectionMode: 'single',
    selectedKeys: selected,
    onSelectionChange: selection => {
      const [newKey] = selection

      if (newKey === HEADER_KEY && onHeaderClick) {
        onHeaderClick()
      }
      else if (newKey === FOOTER_KEY && onFooterClick) {
        onFooterClick()
        if (stateRef.current) {
          nextFocusedKeyRef.current = stateRef?.current?.collection?.getKeyBefore(FOOTER_KEY)
        }
      }
      else if (onSelectionChange) {
        onSelectionChange(typeof newKey === 'string' ? newKey : '')
      }
    },
    children: useItemWrappedChildren(children, header, footer),
  }

  const state = useListState(listStateProps as any)

  stateRef.current = state

  if (nextFocusedKeyRef.current) {
    const focusedKey
      = state.collection.getKeyAfter(nextFocusedKeyRef.current)
      || nextFocusedKeyRef.current

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
  ...props
}: ListBoxUnmanagedProps) {
  const theme = useTheme()

  // Get props for the listbox element
  const ref = useRef()
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
        hue="lighter"
        extendStyle={{
          paddingTop: headerFixed ? 0 : theme.spacing.xxxsmall,
          paddingBottom: footerFixed ? 0 : theme.spacing.xxxsmall,
        }}
        {...listBoxProps}
      >
        {[...state.collection].map(item => (
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
    optionProps, isSelected, isDisabled, labelProps, descriptionProps,
  }
    = useOption({ key: item.key }, state, ref)

  // Determine whether we should show a keyboard
  // focus ring for accessibility
  const { isFocusVisible, focusProps } = useFocusRing()
  const mergedProps = mergeProps(optionProps, focusProps, {
    selected: isSelected,
    disabled: isDisabled,
    labelProps,
    descriptionProps,
    isFocusVisible,
    ref: mergeRefs([ref, item.rendered.ref]),
  })

  return cloneElement(item.rendered, mergedProps)
}

export {
  ListBox,
  ListBoxProps,
  ListBoxUnmanaged,
  ListBoxUnmanagedProps,
  useItemWrappedChildren,
}
