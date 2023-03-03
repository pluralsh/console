import { Flex, FlexProps } from 'honorable'
import { AriaTabListProps } from '@react-types/tabs'
import { useTab, useTabList } from '@react-aria/tabs'
import { TabListState, useTabListState } from '@react-stately/tabs'
import { Node } from '@react-types/shared'
import {
  Children,
  ForwardedRef,
  HTMLAttributes,
  Key,
  MutableRefObject,
  ReactElement,
  ReactNode,
  RefObject,
  cloneElement,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import styled, { useTheme } from 'styled-components'

import { mergeRefs } from '@react-aria/utils'

import { useItemWrappedChildren } from './ListBox'

export type MakeOptional<Type, Key extends keyof Type> = Omit<Type, Key> &
  Partial<Pick<Type, Key>>

export type Renderer = (
  props: HTMLAttributes<HTMLElement>,
  ref: ForwardedRef<any>,
  state: TabListState<object> | null | undefined
) => JSX.Element

type TabBaseProps = {
  key?: Key
  ref?: MutableRefObject<any>
  active?: boolean
  activeSecondary?: boolean
  vertical?: boolean
  textValue?: string
  renderer?: Renderer
  children?: ReactNode
}

type TabListStateProps = Omit<AriaTabListProps<object>, 'children'>
export type TabStateRef = MutableRefObject<{
  state: TabListState<object>
  stateProps: AriaTabListProps<object>
  tabProps: Record<Key, any>
  updateTabPanel: () => any
}>

type ChildrenType = ReactElement<TabBaseProps> | ReactElement<TabBaseProps>[]

type TabListProps = {
  stateRef: TabStateRef
  stateProps?: TabListStateProps
  renderer?: Renderer
  as?: ReactElement & { ref?: MutableRefObject<any> }
  children?: ChildrenType
}
function TabListRef({
  stateRef,
  stateProps,
  renderer,
  as,
  ...props
}: TabListProps & FlexProps,
incomingRef: RefObject<HTMLElement>) {
  const wrappedChildren = useItemWrappedChildren(props.children)
  const finalStateProps: AriaTabListProps<object> = useMemo(() => ({
    ...{
      keyboardActivation: 'manual',
      orientation: 'horizontal',
      children: [...wrappedChildren],
    },
    ...stateProps,
  }),
  [stateProps, wrappedChildren])

  const state = useTabListState(finalStateProps)

  stateRef.current = {
    updateTabPanel: () => {
      console.warn("TabPanel didn't set stateRef.current.updateTabPanel")
    },
    ...(stateRef.current || {}),
    state,
    stateProps: finalStateProps,
    tabProps: stateRef?.current?.tabProps || {},
  }
  useEffect(() => {
    stateRef?.current?.updateTabPanel()
  })

  const ref = useRef<HTMLDivElement>(null)
  const mergedRef = mergeRefs(ref, incomingRef)
  const { tabListProps } = useTabList(finalStateProps, state, ref)
  const tabChildren = [...state.collection].map(item => (
    <TabRenderer
      key={item.key}
      item={item}
      state={state}
      stateProps={finalStateProps}
      stateRef={stateRef}
    />
  ))

  if (as) {
    return cloneElement(as, {
      ...tabListProps,
      ...as.props,
      ...{ children: tabChildren },
      ref: mergedRef,
    })
  }

  if (renderer) {
    // @ts-expect-error
    return renderer({ ...props, ...tabListProps, ...{ children: tabChildren } },
      mergedRef,
      state)
  }

  return (
    <Flex
      {...tabListProps}
      {...props}
      flexDirection={stateProps.orientation === 'vertical' ? 'column' : 'row'}
      alignItems={
        stateProps.orientation === 'vertical' ? 'flex-start' : 'flex-end'
      }
      ref={mergedRef as any}
    >
      {tabChildren}
    </Flex>
  )
}

const TabList = forwardRef(TabListRef)

const TabClone = styled(({
  className, children, tabRef, ...props
}) => cloneElement(Children.only(children), {
  className: `${children.props.className || ''} ${className || ''}`.trim(),
  ref: tabRef,
  ...props,
}))<{ vertical: boolean }>(({ theme, vertical }) => ({
  position: 'relative',
  '&:focus, &:focus-visible': {
    outline: 'none',
    zIndex: theme.zIndexes.base + 1,
  },
  '&:focus-visible': {
    ...theme.partials.focus.default,
  },
  ...(vertical
    ? {
      width: '100%',
    }
    : {}),
}))

type TabRendererProps = {
  item: Node<unknown>
  state: TabListState<object>
  stateProps: AriaTabListProps<object>
  stateRef: TabStateRef
}
function TabRenderer({
  item, state, stateProps, stateRef,
}: TabRendererProps) {
  const ref = useRef(null)
  const { tabProps: props } = useTab({ key: item.key }, state, ref)

  props['aria-controls']
    = props['aria-controls'] || props.id.replace('-tab-', '-tabpanel-')

  stateRef.current.tabProps = {
    ...stateRef.current.tabProps,
    ...{
      [item.key]: { ...props },
    },
  }
  const theme = useTheme()

  if (item.props.renderer) {
    return item.props.renderer({
      ...{
        cursor: 'pointer',
        _focusVisible: { ...theme.partials.focus.default },
        position: 'relative',
        '&:focus, &:focus-visible': {
          zIndex: theme.zIndexes.base + 1,
        },
      },
      ...props,
    },
    ref,
    state)
  }

  return (
    <TabClone
      tabRef={ref}
      {...props}
      active={state.selectedKey === item.key}
      vertical={stateProps.orientation === 'vertical'}
      {...item.props}
    >
      {item.rendered}
    </TabClone>
  )
}

export type { TabListProps, TabListStateProps, TabBaseProps }
export { TabList }
