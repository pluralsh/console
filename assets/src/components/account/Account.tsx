import { Tab, TabList, TabPanel } from '@pluralsh/design-system'
import { useContext, useEffect, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { LoginContext } from 'components/contexts'
import { BreadcrumbsContext } from 'components/layout/Breadcrumbs'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'

const getDirectory = (me, configuration) => [
  { path: 'users', label: 'Users', enabled: true },
  { path: 'groups', label: 'Groups', enabled: true },
  { path: 'roles', label: 'Roles', enabled: true },
  { path: 'webhooks', label: 'Webhooks', enabled: true },
  // TODO: default to false when development is finished
  { path: 'vpn', label: 'VPN clients', enabled: configuration?.vpnEnabled ?? true },
  { path: 'email', label: 'Email settings', enabled: me?.roles?.admin && configuration?.gitStatus?.cloned },
]

export default function Account() {
  const tabStateRef = useRef<any>(null)
  const { me, configuration } = useContext<any>(LoginContext)
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)
  const { pathname } = useLocation()
  const pathPrefix = '/account'

  useEffect(() => setBreadcrumbs([{ text: 'account', url: '/account' }]), [setBreadcrumbs])

  if (!me) return null

  const directory = getDirectory(me, configuration).filter(({ enabled }) => enabled)
  const currentTab = directory.find(tab => pathname?.startsWith(`${pathPrefix}/${tab.path}`))

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer>
        <TabList
          marginTop={90}
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
