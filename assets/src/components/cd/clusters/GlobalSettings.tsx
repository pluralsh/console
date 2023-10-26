import { useTheme } from 'styled-components'
import { Outlet, useLocation } from 'react-router-dom'

import { CD_BASE_PATH, GLOBAL_SETTINGS_PATH } from 'routes/cdRoutesConsts'

import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { SideNavEntries } from 'components/layout/SideNavEntries'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'

export const getGlobalSettingsBreadcrumbs = ({ page }: { page: string }) => [
  ...CD_BASE_CRUMBS,
  { label: 'global settings', url: `${GLOBAL_SETTINGS_PATH}` },
  { label: page, url: `${CD_BASE_PATH}/clusters/${page}` },
]

const directory = [
  {
    path: 'permissions',
    label: 'Permissions',
  },
  {
    path: 'repositories',
    label: 'Repositories',
  },
]

export function GlobalSettings() {
  const theme = useTheme()
  const { pathname } = useLocation()

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer>
        <div
          css={{
            overflowY: 'auto',
            paddingBottom: theme.spacing.medium,
          }}
        >
          <SideNavEntries
            directory={directory}
            pathname={pathname}
            pathPrefix={GLOBAL_SETTINGS_PATH}
          />
        </div>
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutContentContainer role="main">
        <Outlet />
      </ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSidecarContainer />
      <ResponsiveLayoutSpacer />
    </ResponsiveLayoutPage>
  )
}
