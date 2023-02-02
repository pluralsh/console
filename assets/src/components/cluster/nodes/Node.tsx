import { useContext, useEffect, useRef } from 'react'
import { Outlet, useMatch, useParams } from 'react-router-dom'
import { SubTab, TabList, TabPanel } from '@pluralsh/design-system'

import { BreadcrumbsContext } from 'components/layout/Breadcrumbs'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import { LinkTabWrap } from 'components/utils/Tabs'

const DIRECTORY = [
  { path: '', label: 'Info' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

function HeadingTabList({ tabStateRef, currentTab }: any) {
  return (
    <TabList
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
  const { setBreadcrumbs } = useContext(BreadcrumbsContext)

  useEffect(() => {
    if (name) {
      setBreadcrumbs([
        { text: 'nodes', url: '/nodes' },
        { text: name || '', url: `/nodes/${name}` },
      ])
    }
  }, [name, setBreadcrumbs])

  return (
    <TabPanel
      stateRef={tabStateRef}
      as={(
        <ResponsivePageFullWidth
          scrollable={(currentTab?.label ?? 'Info') === 'Info'}
          heading={name}
          headingContent={(
            <HeadingTabList
              tabStateRef={tabStateRef}
              currentTab={currentTab}
            />
          )}
          // eslint-disable-next-line react/no-children-prop
          children={<Outlet />}
        />
      )}
    />
  )
}
