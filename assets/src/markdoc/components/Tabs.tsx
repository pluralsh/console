import { createContext, useRef, useState } from 'react'
import type { Key, ReactNode } from 'react'

import type { TabListStateProps } from '@pluralsh/design-system'
import { TabList, TabPanel } from '@pluralsh/design-system'

import styled from 'styled-components'

import TabComponent from './Tab'

export const TabContext = createContext({})

export const TabPanelStyled = styled(TabPanel)(({ theme }) => ({
  borderBottom: theme.borders.default,
  marginBottom: theme.spacing.xxlarge,
  '> div': {
    marginTop: theme.spacing.large,
    marginBottom: theme.spacing.xlarge,
  },
  'article > &:last-child': {
    border: 'none',
  },
}))

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

export function Tab({ children }) {
  return children
}
