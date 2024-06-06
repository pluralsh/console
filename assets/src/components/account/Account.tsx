import {
  type Breadcrumb,
  Tab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { useLogin } from 'components/contexts'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import { useTheme } from 'styled-components'
import {
  ConsoleConfiguration,
  PersonaConfigurationFragment,
  User,
} from 'generated/graphql'

const getDirectory = (
  me: User,
  configuration: Nullable<ConsoleConfiguration>,
  personaConfiguration: Nullable<PersonaConfigurationFragment>
) => [
  { path: 'users', label: 'Users', enabled: true },
  { path: 'groups', label: 'Groups', enabled: true },
  { path: 'roles', label: 'Roles', enabled: !configuration?.byok },
  { path: 'personas', label: 'Personas', enabled: true },
  { path: 'webhooks', label: 'Webhooks', enabled: !configuration?.byok },
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
  {
    path: 'audits',
    label: 'Audits',
    enabled: !!(
      personaConfiguration?.all || personaConfiguration?.sidebar?.audits
    ),
  },
]

export const BREADCRUMBS: Breadcrumb[] = [{ label: 'account', url: '/account' }]

export default function Account() {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const { me, configuration, personaConfiguration } = useLogin()
  const { pathname } = useLocation()
  const pathPrefix = '/account'

  useSetBreadcrumbs(BREADCRUMBS)

  if (!me) return null

  const directory = getDirectory(
    me,
    configuration,
    personaConfiguration
  ).filter(({ enabled }) => enabled)
  const currentTab = directory.find(
    (tab) => pathname?.startsWith(`${pathPrefix}/${tab.path}`)
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
