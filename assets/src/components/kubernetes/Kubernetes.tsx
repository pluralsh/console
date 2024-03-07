import { Outlet, useLocation } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { WORKLOADS_REL_PATH } from '../../routes/kubernetesRoutesConsts'
import { ResponsiveLayoutPage } from '../utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutSidenavContainer } from '../utils/layout/ResponsiveLayoutSidenavContainer'
import { Directory, SideNavEntries } from '../layout/SideNavEntries'
import { GLOBAL_SETTINGS_ABS_PATH } from '../../routes/cdRoutesConsts'
import { ResponsiveLayoutSpacer } from '../utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from '../utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidecarContainer } from '../utils/layout/ResponsiveLayoutSidecarContainer'

const directory: Directory = [
  { path: WORKLOADS_REL_PATH, label: 'Workloads' },
  { path: '', label: 'Services' },
  { path: '', label: 'Config and Storage' },
  { path: '', label: 'Cluster' },
] as const

export default function Kubernetes() {
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
            pathPrefix={GLOBAL_SETTINGS_ABS_PATH}
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
