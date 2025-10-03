import {
  ArrowTopRightIcon,
  Breadcrumb,
  Button,
  Sidecar,
  SidecarItem,
} from '@pluralsh/design-system'
import { BillingSubscriptionChip } from 'components/billing/BillingSubscriptionChip'
import { PageHeaderContext } from 'components/cd/ContinuousDeployment'
import { useLogin } from 'components/contexts'
import { Directory, SideNavEntries } from 'components/layout/SideNavEntries'
import ConsolePageTitle from 'components/utils/layout/ConsolePageTitle'
import {
  GridHeaderWithSideNav,
  GridLayoutWithSideNav,
} from 'components/utils/layout/ResponsiveGridLayouts'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { PersonaConfigurationFragment } from 'generated/graphql'
import { ReactNode, useMemo, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  AUDITS_REL_PATH,
  GLOBAL_SETTINGS_REL_PATH,
  NOTIFICATIONS_REL_PATH,
  PROJECT_SETTINGS_REL_PATH,
  SETTINGS_ABS_PATH,
  USER_MANAGEMENT_REL_PATH,
} from 'routes/settingsRoutesConst'
import styled, { useTheme } from 'styled-components'

const getDirectory = (
  personaConfiguration: Nullable<PersonaConfigurationFragment>
): Directory => [
  { path: USER_MANAGEMENT_REL_PATH, label: 'User management' },
  { path: GLOBAL_SETTINGS_REL_PATH, label: 'Global settings' },
  { path: PROJECT_SETTINGS_REL_PATH, label: 'Project settings' },
  { path: NOTIFICATIONS_REL_PATH, label: 'Notifications' },
  {
    path: AUDITS_REL_PATH,
    label: 'Audit logs',
    enabled: !!(
      personaConfiguration?.all || personaConfiguration?.sidebar?.audits
    ),
  },
  { path: 'access-tokens', label: 'Access tokens' },
]

export const SETTINGS_BREADCRUMBS: Breadcrumb[] = [
  { label: 'settings', url: SETTINGS_ABS_PATH },
]
export default function Settings() {
  const { personaConfiguration, me, configuration } = useLogin()
  const { pathname } = useLocation()
  const [headerContent, setHeaderContent] = useState<ReactNode>()

  const pageHeaderContext = useMemo(() => ({ setHeaderContent }), [])

  return (
    <GridLayoutWithSideNav>
      <GridHeaderWithSideNav>
        <div />
        <MainHeaderContentSC>{headerContent}</MainHeaderContentSC>
        <SidecarColWrapperSC>
          {configuration?.pluralLogin && (
            <Button
              secondary
              as={Link}
              to="https://app.plural.sh/account/edit"
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<ArrowTopRightIcon />}
            >
              Edit account
            </Button>
          )}
        </SidecarColWrapperSC>
      </GridHeaderWithSideNav>
      <SideNavEntries
        directory={getDirectory(personaConfiguration)}
        pathname={pathname}
        pathPrefix={SETTINGS_ABS_PATH}
      />
      <MainColWrapperSC>
        <PageHeaderContext.Provider value={pageHeaderContext}>
          <Outlet />
        </PageHeaderContext.Provider>
      </MainColWrapperSC>
      <SidecarColWrapperSC>
        <Sidecar>
          <SidecarItem heading="Account name">{me?.name}</SidecarItem>
          <SidecarItem heading="Plan">
            <BillingSubscriptionChip asLink />
          </SidecarItem>
        </Sidecar>
      </SidecarColWrapperSC>
    </GridLayoutWithSideNav>
  )
}

const MainHeaderContentSC = styled.div(({ theme }) => ({
  borderBottom: theme.borders.default,
  overflow: 'hidden',
}))

const MainColWrapperSC = styled.main({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',
})

const SidecarColWrapperSC = styled(ResponsiveLayoutSidecarContainer)({
  margin: 0,
})

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
      headingProps={{ alignSelf: 'center' }}
      css={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: theme.spacing.medium,
        marginBottom: theme.spacing.medium,
      }}
    >
      {children}
    </ConsolePageTitle>
  )
}
