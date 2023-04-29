import { useMemo, useRef } from 'react'
import { Outlet, useMatch, useParams } from 'react-router-dom'
import { TabPanel, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'

import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'

import Sidecar from './PodSidecar'
import SideNav from './PodSideNav'

export default function Node() {
  const tabStateRef = useRef<any>()
  const theme = useTheme()
  const { name, namespace } = useParams()
  const { tab } = useMatch('/pods/:namespace/:name/:tab')?.params || {}

  const breadcrumbs = useMemo(
    () => [
      { label: 'pods', url: '/pods' },
      ...(namespace ? [{ label: namespace, url: `/pods/${namespace}` }] : []),
      ...(namespace && name
        ? [{ label: name, url: `/pods/${namespace}/${name}` }]
        : []),
      ...(tab && namespace && name
        ? [{ label: tab, url: `/pods/${namespace}/${name}/${tab}` }]
        : []),
    ],
    [name, namespace, tab]
  )

  useSetBreadcrumbs(breadcrumbs)

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer paddingTop={40 + theme.spacing.medium}>
        <SideNav tabStateRef={tabStateRef} />
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <TabPanel
        as={<ResponsiveLayoutContentContainer overflow="visible" />}
        stateRef={tabStateRef}
      >
        <Outlet />
      </TabPanel>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutSidecarContainer>
        <Sidecar />
      </ResponsiveLayoutSidecarContainer>
    </ResponsiveLayoutPage>
  )
}
