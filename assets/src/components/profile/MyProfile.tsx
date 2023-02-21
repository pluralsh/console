import {
  PageCard,
  Tab,
  TabList,
  TabPanel,
} from '@pluralsh/design-system'

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
  { path: 'me', label: 'Profile', enabled: true },
  { path: 'security', label: 'Security', enabled: true },
  { path: 'permissions', label: 'Permissions', enabled: true },
  // TODO: default to false when development is finished
  { path: 'vpn', label: 'VPN clients', enabled: configuration?.vpnEnabled ?? true },
]

export default function MyProfile() {
  const tabStateRef = useRef<any>(null)
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)
  const { me, configuration } = useContext<any>(LoginContext)
  const { pathname } = useLocation()
  const pathPrefix = '/profile'
  const directory = getDirectory(me, configuration).filter(({ enabled }) => enabled)

  useEffect(() => setBreadcrumbs([{ text: 'profile', url: '/profile' }]), [setBreadcrumbs])

  if (!me) return null

  const currentTab = directory.find(tab => pathname?.startsWith(`${pathPrefix}/${tab.path}`))

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer>
        <PageCard
          heading={me.name}
          icon={{ name: me.name, url: me.avatar, spacing: 'none' }}
          subheading={me?.email}
          marginBottom="xlarge"
        />
        <TabList
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
