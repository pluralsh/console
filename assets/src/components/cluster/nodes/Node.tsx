import { useEffect, useRef } from 'react'
import { Outlet, useMatch, useParams } from 'react-router-dom'
import {
  SubTab,
  TabList,
  TabPanel,
  useBreadcrumbs,
} from '@pluralsh/design-system'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import { LinkTabWrap } from 'components/utils/Tabs'

const DIRECTORY = [
  { path: '', label: 'Info' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
  { path: 'metadata', label: 'Metadata' },
] as const

function HeadingTabList({ tabStateRef, currentTab }: any) {
  return (
    <TabList
      gap="xxsmall"
      stateRef={tabStateRef}
      stateProps={{
        orientation: 'horizontal',
        selectedKey: currentTab?.path,
      }}
    >
      {DIRECTORY.map(({ label, path }) => (
        <LinkTabWrap
          key={path}
          textValue={label}
          to={path}
          subTab
        >
          <SubTab>{label}</SubTab>
        </LinkTabWrap>
      ))}
    </TabList>
  )
}

export default function Node() {
  const { name } = useParams()
  const tabStateRef = useRef<any>()
  const subpath = useMatch('/nodes/:name/:subpath')?.params?.subpath || ''

  const currentTab = DIRECTORY.find(({ path }) => path === subpath)
  const { setBreadcrumbs } = useBreadcrumbs()

  useEffect(() => {
    if (name) {
      setBreadcrumbs([
        { label: 'nodes', url: '/nodes' },
        { label: name || '', url: `/nodes/${name}` },
      ])
    }
  }, [name, setBreadcrumbs])

  return (
    <TabPanel
      stateRef={tabStateRef}
      as={
        <ResponsivePageFullWidth
          scrollable={
            (currentTab?.label ?? 'Info') === 'Info' ||
            currentTab?.label === 'Metadata'
          }
          heading={name}
          headingContent={
            <HeadingTabList
              tabStateRef={tabStateRef}
              currentTab={currentTab}
            />
          }
          // eslint-disable-next-line react/no-children-prop
          children={<Outlet />}
        />
      }
    />
  )
}
