import { SubTab, TabList } from '@pluralsh/design-system'
import { ReactNode, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { useLogin } from 'components/contexts'
import { ConsoleConfiguration, User } from 'generated/graphql'
import { USER_MANAGEMENT_ABS_PATH } from 'routes/settingsRoutesConst'
import { useTheme } from 'styled-components'

import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { LinkTabWrap } from 'components/utils/Tabs'

import ConsolePageTitle from 'components/utils/layout/ConsolePageTitle'

import { SETTINGS_BREADCRUMBS } from '../Settings'

const getDirectory = (
  me: Nullable<User>,
  configuration: Nullable<ConsoleConfiguration>
) => [
  { path: 'users', label: 'Users', enabled: true },
  { path: 'groups', label: 'Groups', enabled: true },
  { path: 'service-accounts', label: 'Service Accounts', enabled: true },
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
]

export const getUserManagementBreadcrumbs = (page: string) => [
  ...SETTINGS_BREADCRUMBS,
  { label: 'user-management', url: USER_MANAGEMENT_ABS_PATH },
  { label: page, url: `${USER_MANAGEMENT_ABS_PATH}/${page}` },
]

export default function UserManagement() {
  const tabStateRef = useRef<any>(null)
  const { me, configuration } = useLogin()
  const { pathname } = useLocation()

  const directory = getDirectory(me, configuration).filter(
    ({ enabled }) => enabled
  )
  const currentTab = directory.find(
    (tab) => pathname?.startsWith(`${USER_MANAGEMENT_ABS_PATH}/${tab.path}`)
  )

  const headerContent = (
    <TabList
      scrollable
      gap="xxsmall"
      paddingBottom="large"
      stateRef={tabStateRef}
      stateProps={{
        selectedKey: currentTab?.path,
      }}
    >
      {directory.map(({ label, path }) => (
        <LinkTabWrap
          subTab
          key={path}
          textValue={label}
          to={`${USER_MANAGEMENT_ABS_PATH}/${path}`}
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
  )

  useSetPageHeaderContent(headerContent)

  if (!me) return null

  return <Outlet />
}

export function SettingsPageHeader({
  heading,
  children,
}: {
  heading?: ReactNode
  children: ReactNode
}) {
  const theme = useTheme()

  return (
    <ConsolePageTitle
      heading={heading}
      headingProps={{ alignSelf: 'flex-start' }}
    >
      <div
        css={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: theme.spacing.medium,
          marginBottom: theme.spacing.medium,
        }}
      >
        {children}
      </div>
    </ConsolePageTitle>
  )
}
