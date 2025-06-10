import { mergeRefs } from '@react-aria/utils'
import { type Key, type Node } from '@react-types/shared'
import { type AriaTabListProps } from '@react-types/tabs'
import { Flex, type FlexProps } from 'honorable'
import {
  Children,
  type ComponentProps,
  type HTMLAttributes,
  type JSX,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
  cloneElement,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { useTab, useTabList } from 'react-aria'
import { type TabListState, useTabListState } from 'react-stately'
import styled, { useTheme } from 'styled-components'

import ArrowScroll from './ArrowScroll'
import { useItemWrappedChildren } from './ListBox'
import WrapWithIf from './WrapWithIf'

export type MakeOptional<Type, Key extends keyof Type> = Omit<Type, Key> &
  Partial<Pick<Type, Key>>

export type Renderer = (
  props: HTMLAttributes<HTMLElement>,
  ref: RefObject<any>,
  state: TabListState<object> | null | undefined
) => JSX.Element

type TabBaseProps = {
  key?: Key
  ref?: RefObject<any>
  active?: boolean
  activeSecondary?: boolean
  vertical?: boolean
  disabled?: boolean
  textValue?: string
  renderer?: Renderer
  children?: ReactNode
}

type TabListStateProps = Omit<AriaTabListProps<object>, 'children'>
export type TabStateRef = RefObject<{
  state: TabListState<object>
  stateProps: AriaTabListProps<object>
  tabProps: Record<Key, any>
  updateTabPanel: () => any
}>

type ChildrenType =
  | Nullable<ReactElement<TabBaseProps>>
  | Nullable<ReactElement<TabBaseProps>>[]

type TabListProps = {
  stateRef: TabStateRef
  stateProps?: TabListStateProps
  scrollable?: boolean
  renderer?: Renderer
  as?: ReactElement<any> & { ref?: RefObject<any> }
  children?: ChildrenType
}

function TabList({
  ref: incomingRef,
  stateRef,
  stateProps,
  renderer,
  as,
  scrollable,
  ...props
}: TabListProps & FlexProps) {
  const wrappedChildren = useItemWrappedChildren(props.children)
  const finalStateProps: AriaTabListProps<object> = useMemo(
    () => ({
      ...{
        keyboardActivation: 'manual',
        orientation: 'horizontal',
        children: [...wrappedChildren],
      },
      ...stateProps,
    }),
    [stateProps, wrappedChildren]
  )

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
  const mergedRef = mergeRefs(ref, incomingRef) as RefObject<any>
  const { tabListProps } = useTabList(finalStateProps, state, ref)
  const tabChildren = [...state.collection].map((item) => (
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
    return renderer(
      { ...props, ...tabListProps, ...{ children: tabChildren } },
      mergedRef,
      state
    )
  }

  return (
    <WrapWithIf
      condition={scrollable}
      wrapper={<ArrowScroll />}
    >
      <Flex
        {...tabListProps}
        {...props}
        flexDirection={stateProps.orientation === 'vertical' ? 'column' : 'row'}
        alignItems={
          stateProps.orientation === 'vertical' ? 'flex-start' : 'flex-end'
        }
        css={{
          ...(scrollable && {
            overflow: 'auto',
            whiteSpace: 'nowrap',
          }),
        }}
        ref={mergedRef as any}
      >
        {tabChildren}
      </Flex>
    </WrapWithIf>
  )
}

const TabClone = styled(
  ({
    className,
    children,
    tabRef,
    ...props
  }: ComponentProps<any> & {
    children: ReactElement<any>
    tabRef: Ref<any>
  }) =>
    cloneElement(Children.only(children), {
      className: `${children.props.className || ''} ${className || ''}`.trim(),
      ref: tabRef,
      ...props,
    })
)<{ vertical: boolean }>(({ theme, vertical }) => ({
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

function TabRenderer({ item, state, stateProps, stateRef }: TabRendererProps) {
  const ref = useRef(null)
  const { tabProps: props } = useTab({ key: item.key }, state, ref)

  props['aria-controls'] =
    props['aria-controls'] || props.id.replace('-tab-', '-tabpanel-')

  stateRef.current.tabProps = {
    ...stateRef.current.tabProps,
    ...{
      [item.key]: { ...props },
    },
  }
  const theme = useTheme()

  if (item.props.renderer) {
    return item.props.renderer(
      {
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
      state
    )
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

export { TabList }
export type { TabBaseProps, TabListProps, TabListStateProps }
