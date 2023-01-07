import { useEffect, useRef } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { Flex } from 'honorable'
import { TabPanel } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { ResponsiveLayoutSidecarContainer } from 'components/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/layout/ResponsiveLayoutContentContainer'

import { useBreadcrumbs } from 'components/Breadcrumbs'

import Sidecar from './ContainerSidecar'
import SideNav from './PodSideNav'

export default function Node() {
  const tabStateRef = useRef<any>()
  const theme = useTheme()
  const { name, namespace, container } = useParams()
  const { setBreadcrumbs } = useBreadcrumbs()

  // TODO: Investigate whether these links could more specific,
  // based on where they navigated from, perhaps the `namespace` crumb
  // could navigate to the Pods view already filtered for that namespace
  useEffect(() => {
    if (name && namespace && container) {
      setBreadcrumbs([
        { text: 'nodes', url: '/nodes' }, // Add filter param here later maybe?
        { text: 'pods', url: '/pods' }, // Add filter param here later maybe?
        { text: name, url: `/pods/${namespace}/${name}` },
        { text: 'containers' }, // Add filter param here later maybe?
        { text: container, url: `/pods/${namespace}/${name}/shell/${container}` },
      ])
    }
  }, [container, name, namespace, setBreadcrumbs])

  return (
    <Flex
      height="100%"
      width="100%"
      overflowY="hidden"
      paddingLeft={theme.spacing.xlarge}
      paddingRight={theme.spacing.xlarge}
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
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutSidecarContainer width="200px">
        <Sidecar />
      </ResponsiveLayoutSidecarContainer>
    </Flex>
  )
}
