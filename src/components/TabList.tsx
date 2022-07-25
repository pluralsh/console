import {
  Div, DivProps, Flex, FlexProps,
} from 'honorable'
import { AriaTabListProps } from '@react-types/tabs'
import { Item } from '@react-stately/collections'
import { useTab, useTabList, useTabPanel } from '@react-aria/tabs'
import { TabListState } from '@react-stately/tabs'
import { ItemProps, Node } from '@react-types/shared'
import {
  ComponentPropsWithRef,
  HTMLAttributes,
  RefObject,
  useRef,
} from 'react'

import Tab from './Tab'
import SubTab from './SubTab'

type TabListStateProps = AriaTabListProps<object>;

type Renderer = (
  props: HTMLAttributes<HTMLElement>,
  ref: RefObject<any>,
  state: TabListState<object>
) => JSX.Element;

type MakeOptional<Type, Key extends keyof Type> = Omit<Type, Key> &
  Partial<Pick<Type, Key>>;

type TabListItemProps = ComponentPropsWithRef<typeof Tab> &
  MakeOptional<ItemProps<void>, 'children'> & {
    renderer?: Renderer;
  };

const TabListItem = Item as (props: TabListItemProps) => JSX.Element

type TabStyle = 'default' | 'subtab';

type TabListProps = {
  state: TabListState<object>;
  stateProps: TabListStateProps;
  renderer?: Renderer;
  tabStyle?: TabStyle;
};
function TabList({
  state,
  stateProps,
  renderer,
  tabStyle,
  ...props
}: TabListProps & FlexProps) {
  stateProps = {
    ...{
      keyboardActivation: 'manual',
      orientation: 'horizontal',
    },
    ...stateProps,
  }
  const ref = useRef<HTMLDivElement>(null)
  const { tabListProps } = useTabList(stateProps, state, ref)
  const tabChildren = [...state.collection].map(item => (
    <TabRenderer
      key={item.key}
      item={item}
      state={state}
      stateProps={stateProps}
      tabStyle={tabStyle}
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

type TabRendererProps = {
  item: Node<unknown>;
  state: TabListState<object>;
  stateProps: TabListStateProps;
  tabStyle: TabStyle;
};
function TabRenderer({
  item, state, stateProps, tabStyle = 'default',
}: TabRendererProps) {
  const ref = useRef(null)
  const { tabProps: props } = useTab({ key: item.key }, state, ref)

  const TabComponent = tabStyle === 'subtab' ? SubTab : Tab

  if (item.props.renderer) {
    if (item.rendered) {
      props.children = (
        <TabComponent
          active={state.selectedKey === item.key}
          vertical={stateProps.orientation === 'vertical'}
          width={stateProps.orientation === 'vertical' ? '100%' : 'auto'}
          {...item.props}
        >
          {item.rendered}
        </TabComponent>
      )
    }

    return item.props.renderer({
      ...{
        cursor: 'pointer',
        _focusVisible: { outline: '1px solid border-outline-focused' },
      },
      ...props,
    },
    ref,
    state)
  }

  return (
    <TabComponent
      ref={ref}
      {...props}
      active={state.selectedKey === item.key}
      vertical={stateProps.orientation === 'vertical'}
      {...item.props}
    >
      {item.rendered}
    </TabComponent>
  )
}

type TabPanelProps = {
  state: TabListState<object>;
  stateProps: TabListStateProps;
  renderer?: Renderer;
};

function TabPanel({
  state,
  stateProps,
  renderer,
  ...props
}: TabPanelProps & DivProps) {
  const ref = useRef()
  const { tabPanelProps } = useTabPanel(stateProps, state, ref)

  if (renderer) {
    return renderer({ ...tabPanelProps, ...props }, ref, state)
  }

  return (
    <Div
      {...tabPanelProps}
      {...props}
      ref={ref}
    />
  )
}

export {
  TabList,
  TabListProps,
  TabListItem,
  TabListItemProps,
  TabPanel,
  TabPanelProps,
  TabListStateProps,
}
