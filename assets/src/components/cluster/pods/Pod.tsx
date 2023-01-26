import { useEffect, useRef } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { Flex } from 'honorable'
import { TabPanel } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'

import { useBreadcrumbs } from 'components/Breadcrumbs'

import Sidecar from './PodSidecar'
import SideNav from './PodSideNav'

export default function Node() {
  const tabStateRef = useRef<any>()
  const theme = useTheme()
  const { name, namespace } = useParams()
  const { setBreadcrumbs } = useBreadcrumbs()

  // TODO: Investigate whether these links could more specific,
  // based on where they navigated from, perhaps the `namespace` crumb
  // could navigate to the Pods view already filtered for that namespace
  useEffect(() => {
    if (name && namespace) {
      setBreadcrumbs([
        { text: 'nodes', url: '/nodes' }, // Add filter param here later maybe?
        { text: 'pods', url: '/pods' }, // Add filter param here later maybe?
        { text: name, url: name },
      ])
    }
  }, [name, namespace, setBreadcrumbs])

  return (
    <Flex
      height="100%"
      width="100%"
      overflowY="hidden"
      padding={theme.spacing.xlarge}
      paddingTop={theme.spacing.large}
    >
      <ResponsiveLayoutSidenavContainer
        width={240}
        paddingTop={theme.spacing.xxxlarge}
      >
        <SideNav tabStateRef={tabStateRef} />
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <TabPanel
        as={<ResponsiveLayoutContentContainer overflow="visible" />}
        stateRef={tabStateRef}
      >
        <Outlet />
      </TabPanel>
      <ResponsiveLayoutSidecarContainer width="200px">
        <Sidecar />
      </ResponsiveLayoutSidecarContainer>
      <ResponsiveLayoutSpacer />
    </Flex>
  )
}
