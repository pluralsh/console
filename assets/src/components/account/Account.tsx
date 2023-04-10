import {
  type Breadcrumb,
  Tab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useContext, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { LoginContext } from 'components/contexts'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import { useTheme } from 'styled-components'

const getDirectory = (me, configuration) => [
  { path: 'users', label: 'Users', enabled: true },
  { path: 'groups', label: 'Groups', enabled: true },
  { path: 'roles', label: 'Roles', enabled: true },
  { path: 'webhooks', label: 'Webhooks', enabled: true },
  {
    path: 'vpn',
    label: 'VPN clients',
    enabled: configuration?.vpnEnabled ?? false,
  },
  {
    path: 'email',
    label: 'Email settings',
    enabled: me?.roles?.admin && configuration?.gitStatus?.cloned,
  },
  { path: 'settings', label: 'Account settings', enabled: true },
  { path: 'cookies', label: 'Cookie settings', enabled: true },
]

const breadcrumbs: Breadcrumb[] = [{ label: 'account', url: '/account' }]

export default function Account() {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const { me, configuration } = useContext<any>(LoginContext)
  const { pathname } = useLocation()
  const pathPrefix = '/account'

  useSetBreadcrumbs(breadcrumbs)

  if (!me) return null

  const directory = getDirectory(me, configuration).filter(
    ({ enabled }) => enabled
  )
  const currentTab = directory.find((tab) =>
    pathname?.startsWith(`${pathPrefix}/${tab.path}`)
  )

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer>
        <TabList
          marginTop={40 + theme.spacing.medium}
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'vertical',
            selectedKey: currentTab?.path,
          }}
        >
          {directory.map(({ label, path }) => (
            <Tab
              key={path}
              as={Link}
              to={path}
              textDecoration="none"
            >
              {label}
            </Tab>
          ))}
        </TabList>
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <TabPanel
        as={<ResponsiveLayoutContentContainer />}
        stateRef={tabStateRef}
      >
        <Outlet />
      </TabPanel>
      <ResponsiveLayoutSidecarContainer />
      <ResponsiveLayoutSpacer />
    </ResponsiveLayoutPage>
  )
}
