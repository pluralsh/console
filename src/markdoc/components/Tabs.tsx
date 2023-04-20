import {
  type Key,
  type PropsWithChildren,
  type ReactNode,
  createContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import styled from 'styled-components'

import { TabList, TabPanel } from '../../index'
import type { TabListStateProps } from '../../index'

import TabComponent from './Tab'

const TabContext = createContext({})

const TabListStyled = styled(TabList)(({ theme }) => ({
  flexShrink: 0,
  justifyContent: 'stretch',
  width: '100%',
  marginTop: theme.spacing.large,
  marginBottom: theme.spacing.large,
}))

type TabProps = {
  title: string
  children: ReactNode
}

const getTabKey = (tab: TabProps, index: number) =>
  `${tab.title ?? ''}-${index}`

export function Tabs({ tabs }: { tabs: TabProps[] }) {
  const tabStateRef = useRef<any>()
  const [selectedKey, setSelectedKey] = useState<Key>(tabs[0].title || '')
  const tabListStateProps: TabListStateProps = {
    keyboardActivation: 'manual',
    orientation: 'horizontal',
    selectedKey,
    onSelectionChange: setSelectedKey,
  }
  const keyedTabs = useMemo(
    () => tabs.map((tab, i) => ({ key: getTabKey(tab, i), ...tab })),
    [tabs]
  )

  return (
    <TabContext.Provider value={selectedKey}>
      <TabListStyled
        stateRef={tabStateRef}
        stateProps={tabListStateProps}
      >
        {keyedTabs.map(({ key, title }) => (
          <TabComponent
            key={key}
            textValue={title}
          >
            {title}
          </TabComponent>
        ))}
      </TabListStyled>
      {keyedTabs.map(({ key, children }) => (
        <TabPanel
          key={key}
          tabKey={key}
          mode="multipanel"
          stateRef={tabStateRef}
        >
          {children}
        </TabPanel>
      ))}
    </TabContext.Provider>
  )
}

export function Tab({ children }: PropsWithChildren) {
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>
}
