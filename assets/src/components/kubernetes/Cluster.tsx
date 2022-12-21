import { useRef } from 'react'
import { Outlet } from 'react-router-dom'

import { Flex } from 'honorable'

import { TabPanel } from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { ResponsiveLayoutSidecarContainer } from 'components/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/layout/ResponsiveLayoutContentContainer'

import NodesSideNav from './nodes/NodesSideNav'

function NodesPods() {
  const tabStateRef = useRef<any>()
  const theme = useTheme()

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
        paddingTop={theme.spacing.xxxlarge + theme.spacing.large}
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

export default NodesPods
