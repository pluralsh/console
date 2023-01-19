import { useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'

import { Flex } from 'honorable'

import { TabPanel } from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'

import { useBreadcrumbs } from 'components/Breadcrumbs'

import NodesSideNav from './nodes/NodesSideNav'

function Cluster() {
  const tabStateRef = useRef<any>()
  const theme = useTheme()

  const { setBreadcrumbs } = useBreadcrumbs()

  useEffect(() => {
    setBreadcrumbs([
      { text: 'cluster', url: '/nodes' },
    ])
  }, [setBreadcrumbs])

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
        <NodesSideNav tabStateRef={tabStateRef} />
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <TabPanel
        as={<ResponsiveLayoutContentContainer overflow="visible" />}
        stateRef={tabStateRef}
      >
        <Outlet />
      </TabPanel>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutSidecarContainer width="200px" />
    </Flex>
  )
}

export default Cluster

