import {
  Div, DivProps, Flex, FlexProps,
} from 'honorable'
import { AriaTabListProps } from '@react-types/tabs'
import { useTab, useTabList, useTabPanel } from '@react-aria/tabs'
import { TabListState, useTabListState } from '@react-stately/tabs'
import { Node } from '@react-types/shared'
import {
  Children,
  HTMLAttributes,
  Key,
  MutableRefObject,
  ReactElement,
  ReactNode,
  RefObject,
  cloneElement,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'
import styled, { useTheme } from 'styled-components'

import { useItemWrappedChildren } from './ListBox'

type Renderer = (
  props: HTMLAttributes<HTMLElement>,
  ref: RefObject<any> | null | undefined,
  state: TabListState<object> | null | undefined
) => JSX.Element

type TabBaseProps = {
  key?: Key
  ref?: MutableRefObject<any>
  active?: boolean
  vertical?: boolean
  textValue?: string
  renderer?: Renderer
  children?: ReactNode
}

type TabListStateProps = Omit<AriaTabListProps<object>, 'children'>
type TabStateRef = MutableRefObject<{
  state: TabListState<object>
  stateProps: AriaTabListProps<object>
}>

type ChildrenType = ReactElement<TabBaseProps> | ReactElement<TabBaseProps>[]

type TabListProps = {
  stateRef: TabStateRef
  renderer?: Renderer
  children?: ChildrenType
}
function TabList({
  stateRef,
  stateProps,
  renderer,
  ...props
}: TabListProps & FlexProps) {
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

  useImperativeHandle(stateRef,
    () => ({
      state,
      stateProps: finalStateProps,
    }),
    [state, finalStateProps])

  const ref = useRef<HTMLDivElement>(null)
  const { tabListProps } = useTabList(finalStateProps, state, ref)
  const tabChildren = [...state.collection].map(item => (
    <TabRenderer
      key={item.key}
      item={item}
      state={state}
      stateProps={finalStateProps}
    />
  ))

  if (renderer) {
    return renderer({ ...props, ...tabListProps, ...{ children: tabChildren } },
      ref,
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
      ref={ref}
    >
      {tabChildren}
    </Flex>
  )
}

const TabClone = styled(({
  className, children, tabRef, ...props
}) => cloneElement(Children.only(children), {
  className: `${children.props.className} ${className}`.trim(),
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
}
function TabRenderer({ item, state, stateProps }: TabRendererProps) {
  const ref = useRef(null)
  const { tabProps: props } = useTab({ key: item.key }, state, ref)
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

type TabPanelProps = DivProps & {
  stateRef: TabStateRef
  renderer?: Renderer
}

function WrappedTabPanel({
  stateRef: {
    current: { state, stateProps },
  },
  renderer,
  ...props
}: TabPanelProps) {
  const ref = useRef()
  const { tabPanelProps } = useTabPanel(stateProps, state, ref)

  if (renderer) {
    return renderer({ ...tabPanelProps, ...props }, ref, state)
  }

  return (
    <Div
      ref={ref}
      {...tabPanelProps}
      {...props}
    />
  )
}

function TabPanel(props: TabPanelProps) {
  if (props.stateRef.current) {
    return <WrappedTabPanel {...props} />
  }

  if (props.renderer) {
    return props.renderer({ ...props }, null, null)
  }

  return <Div {...props} />
}

export {
  TabList,
  TabListProps,
  TabPanel,
  TabPanelProps,
  TabListStateProps,
  TabBaseProps,
}
