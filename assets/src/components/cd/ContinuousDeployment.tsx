import {
  SubTab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useMemo, useRef } from 'react'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import { Outlet, useMatch } from 'react-router-dom'
import { LinkTabWrap } from 'components/utils/Tabs'
import { CD_BASE_PATH } from 'routes/cdRoutes'

const directory = [
  { path: 'clusters', label: 'Clusters' },
  { path: 'services', label: 'Services' },
  { path: 'pipelines', label: 'Pipelines' },
  { path: 'git', label: 'Git Repository' },
  { path: 'providers', label: 'Providers' },
] as const

export default function Apps() {
  const tabStateRef = useRef<any>(null)

  const tab = useMatch(`/${CD_BASE_PATH}/:tab`)?.params?.tab || ''

  const path = `/${CD_BASE_PATH}/${tab}`

  const currentTab = directory.find(({ path }) => path === tab)
  const crumbs = useMemo(
    () => (path ? [{ label: tab, path }] : []),
    [path, tab]
  )

  useSetBreadcrumbs(crumbs)

  return (
    <ResponsivePageFullWidth
      headingContent={
        <TabList
          gap="xxsmall"
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'horizontal',
            selectedKey: currentTab?.path,
          }}
        >
          {directory.map(({ label, path }) => (
            <LinkTabWrap
              subTab
              key={path}
              textValue={label}
              to={`/${CD_BASE_PATH}/${path}`}
            >
              <SubTab
                key={path}
                textValue={label}
              >
                {label}
              </SubTab>
            </LinkTabWrap>
          ))}
        </TabList>
      }
    >
      <TabPanel stateRef={tabStateRef}>
        <Outlet />
      </TabPanel>
    </ResponsivePageFullWidth>
  )
}
