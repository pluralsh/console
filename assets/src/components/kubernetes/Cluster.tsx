import { useRef } from 'react'
import { Outlet } from 'react-router-dom'

import { Flex } from 'honorable'

import { TabPanel } from '@pluralsh/design-system'

import { ResponsiveLayoutSidecarContainer } from 'components/layout/ResponsiveLayoutSidecarContainer'

import { ResponsiveLayoutSidenavContainer } from '../layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from '../layout/ResponsiveLayoutSpacer'

import { ResponsiveLayoutContentContainer } from '../layout/ResponsiveLayoutContentContainer'

import NodesSideNav from './nodes/NodesSideNav'

function NodesPods() {
  const tabStateRef = useRef<any>()

  return (
    <Flex
      height="100%"
      width="100%"
      overflowY="hidden"
      padding={32}
      paddingTop={88}
    >
      <ResponsiveLayoutSidenavContainer width={240}>
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
