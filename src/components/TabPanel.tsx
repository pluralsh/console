import { Div, DivProps } from 'honorable'
import { useTabPanel } from '@react-aria/tabs'
import {
  Key,
  MutableRefObject,
  ReactElement,
  cloneElement,
  forwardRef,
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from 'react'
import { mergeProps, mergeRefs } from '@react-aria/utils'

import styled from 'styled-components'

import { useVisuallyHidden } from '@react-aria/visually-hidden'

import { MakeOptional, Renderer, TabStateRef } from './TabList'

/*
mode='multipanel'
  Use when you all tab content visible in the DOM at all time (such as for
  search indexing the docs site, etc).
  In this mode, each tab will need it's own TabPanel with the `tabKey` prop set
  to the same key as the tab associated with it.
  Each TabPanel should contain static content that does not change. The content
  will be hidden/shown visually based on the selected tab.

mode='singlepanel' (default)
  Uses a single TabPanel to display tab contents. Use for fully dynamic content
  that doesn't need to be search indexable (Such as dynamically fetched content
  in the app).

  'tabKey' prop will be ignored in this mode.
*/
type Mode = 'multipanel' | 'singlepanel'

export type WrappedTabPanelProps = DivProps & {
  stateRef: TabStateRef
  renderer?: Renderer
  as: ReactElement & { ref?: MutableRefObject<any> }
  mode?: Mode
  tabKey?: Key
}

type TabPanelProps = MakeOptional<WrappedTabPanelProps, 'as'>

export const TabPanelClone = styled(({
  className, cloneAs, tabRef, ...props
}) => cloneElement(cloneAs, {
  className: `${cloneAs.props.className || ''} ${className || ''}`.trim(),
  ref: tabRef,
  ...props,
}))<{ vertical: boolean }>(({ theme }) => ({
  position: 'relative',
  '&:focus, &:focus-visible': {
    outline: 'none',
    zIndex: theme.zIndexes.base + 1,
  },
}))

function WrappedTabPanel({
  stateRef: {
    current: { state, stateProps, tabProps },
  },
  renderer,
  as,
  tabKey,
  mode,
  ...props
}: WrappedTabPanelProps) {
  const ref = useRef()
  let { tabPanelProps } = useTabPanel(stateProps, state, ref)
  const { visuallyHiddenProps } = useVisuallyHidden()

  if (mode === 'multipanel') {
    const thisTabProps = tabProps[tabKey]

    if (!thisTabProps) {
      console.warn('Unable to find props for TabPanel. Did you forget to create a TabList?')
    }
    tabPanelProps = {
      'aria-labelledby': thisTabProps.id,
      id: thisTabProps['aria-controls'],
      ...(state.selectedKey !== tabKey
        ? { ...visuallyHiddenProps, 'aria-hidden': true }
        : {}),
    }
  }
  console.log('tabPanelProps', tabPanelProps)

  if (renderer) {
    return renderer(mergeProps(tabPanelProps, props), ref, state)
  }

  const mergedProps = mergeProps(tabPanelProps, as.props, {
    children: props.children,
  })

  return (
    <TabPanelClone
      tabRef={mergeRefs(as.ref, ref)}
      cloneAs={as}
      {...mergedProps}
    />
  )
}

const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(({
  as, renderer, stateRef, tabKey, mode, ...props
}, ref) => {
    // https://reactjs.org/docs/hooks-faq.html#is-there-something-like-forceupdate
  const [numRechecks, recheckStateRef] = useReducer(x => x + 1, 0)
  const [, forceUpdate] = useReducer(x => x + 1, 0)
  const updateTabPanel = useCallback(() => forceUpdate(), [forceUpdate])

  if (mode === 'multipanel' && !tabKey) {
    throw new Error("TabPanel: tabKey prop must be set when mode='multipanel'")
  }
  if (mode === 'singlepanel' && tabKey) {
    console.warn("TabPanel: tabKey prop is not supported for mode='singlepanel'. Did you mean to set mode='multipanel'?")
  }

    // Force update until stateRef.current has been filled
  useEffect(() => {
    if (!stateRef?.current) {
      if (numRechecks > 1000) {
        console.warn('TabPanel stateRef never received a value. Did you forget to pass stateRef to both TabList and TabPanel?')

        return
      }
      recheckStateRef()
    }
  })

  if (!renderer && !as) {
    as = (
      <Div
        ref={ref}
        {...props}
      />
    )
  }

  if (stateRef.current) {
    stateRef.current.updateTabPanel = updateTabPanel

    return (
      <WrappedTabPanel
        mode={mode}
        as={as}
        renderer={renderer}
        stateRef={stateRef}
        tabKey={tabKey}
        {...props}
      />
    )
  }

  if (renderer) {
    return renderer({ ...props }, null, null)
  }

  return (
    <TabPanelClone
      tabRef={mergeRefs(as.ref, ref)}
      cloneAs={as}
    >
      {props.children}
    </TabPanelClone>
  )
})

export default TabPanel
