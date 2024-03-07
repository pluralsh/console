import { Outlet, useLocation, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import {
  SERVICES_REL_PATH,
  WORKLOADS_REL_PATH,
} from '../../routes/kubernetesRoutesConsts'
import { ResponsiveLayoutPage } from '../utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutSidenavContainer } from '../utils/layout/ResponsiveLayoutSidenavContainer'
import { Directory, SideNavEntries } from '../layout/SideNavEntries'
import { ResponsiveLayoutContentContainer } from '../utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidecarContainer } from '../utils/layout/ResponsiveLayoutSidecarContainer'

const directory: Directory = [
  { path: WORKLOADS_REL_PATH, label: 'Workloads' },
  { path: SERVICES_REL_PATH, label: 'Services' },
  { path: 'config', label: 'Config and Storage' },
  { path: 'cluster', label: 'Cluster' },
] as const

export default function Kubernetes() {
  const theme = useTheme()
  const { pathname } = useLocation()
  const { clusterId } = useParams()
  const pathPrefix = clusterId ? `/kubernetes/${clusterId}` : `kubernetes`

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
            pathPrefix={pathPrefix}
          />
        </div>
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutContentContainer
        role="main"
        width="100%"
      >
        <Outlet />
      </ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSidecarContainer />
    </ResponsiveLayoutPage>
  )
}
