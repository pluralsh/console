import { PageCard, Tab, TabList, TabPanel } from '@pluralsh/design-system'

import { useContext, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { LoginContext } from 'components/contexts'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import { useTheme } from 'styled-components'

const getDirectory = (_, configuration) => [
  { path: 'me', label: 'Profile', enabled: true },
  { path: 'email-settings', label: 'Email settings', enabled: true },
  { path: 'security', label: 'Security', enabled: true },
  { path: 'permissions', label: 'Permissions', enabled: true },
  { path: 'access-tokens', label: 'Access tokens', enabled: true },
  {
    path: 'vpn',
    label: 'VPN clients',
    enabled: configuration?.vpnEnabled ?? false,
  },
]

export const PROFILE_BREADCRUMBS = [{ label: 'profile', url: '/profile' }]

export default function MyProfile() {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const { me, configuration } = useContext<any>(LoginContext)
  const { pathname } = useLocation()
  const pathPrefix = '/profile'
  const directory = getDirectory(me, configuration).filter(
    ({ enabled }) => enabled
  )

  if (!me) return null

  const currentTab = directory.find((tab) =>
    pathname?.startsWith(`${pathPrefix}/${tab.path}`)
  )

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer>
        <PageCard
          heading={me.name}
          icon={{ name: me.name, url: me.avatar, spacing: 'none' }}
          subheading={me?.email}
          marginBottom="medium"
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
        as={
          <ResponsiveLayoutContentContainer
            css={{ paddingBottom: theme.spacing.xlarge }}
          />
        }
        stateRef={tabStateRef}
      >
        <Outlet />
      </TabPanel>
      <ResponsiveLayoutSidecarContainer />
      <ResponsiveLayoutSpacer />
    </ResponsiveLayoutPage>
  )
}
