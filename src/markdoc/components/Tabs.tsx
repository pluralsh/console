import {
  type Key,
  type PropsWithChildren,
  type ReactNode,
  createContext,
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

export function Tabs({ tabs }: { tabs: TabProps[] }) {
  const tabStateRef = useRef<any>()
  const [selectedKey, setSelectedKey] = useState<Key>(tabs[0].title || '')
  const tabListStateProps: TabListStateProps = {
    keyboardActivation: 'manual',
    orientation: 'horizontal',
    selectedKey,
    onSelectionChange: setSelectedKey,
  }

  return (
    <TabContext.Provider value={selectedKey}>
      <TabListStyled
        stateRef={tabStateRef}
        stateProps={tabListStateProps}
      >
        {tabs.map(({ title }) => (
          <TabComponent
            key={title}
            textValue={title}
          >
            {title}
          </TabComponent>
        ))}
      </TabListStyled>
      {tabs.map(({ children, title }) => (
        <TabPanel
          key={title}
          tabKey={title}
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
