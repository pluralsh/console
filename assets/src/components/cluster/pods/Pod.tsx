import { useEffect, useRef } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { Flex } from 'honorable'
import { LoopingLogo, TabPanel } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { ResponsiveLayoutSidecarContainer } from 'components/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/layout/ResponsiveLayoutContentContainer'

import { useBreadcrumbs } from 'components/Breadcrumbs'

import { useQuery } from 'react-apollo'

import { POLL_INTERVAL } from '../constants'
import { POD_Q } from '../queries'

import Sidecar from './PodSidecar'
import SideNav from './PodSideNav'

export default function Node() {
  const tabStateRef = useRef<any>()
  const theme = useTheme()
  const { name, namespace } = useParams()
  const { setBreadcrumbs } = useBreadcrumbs()

  const { data } = useQuery(POD_Q, {
    variables: { name, namespace },
    pollInterval: POLL_INTERVAL,
  })

  // TODO: Investigate whether these links should be more specific, based on where they navigated from
  useEffect(() => {
    if (name && namespace) {
      setBreadcrumbs([
        { text: 'pods', url: '/pods' },
        { text: namespace, url: namespace },
        { text: name, url: name },
      ])
    }
  }, [name, namespace, setBreadcrumbs])

  if (!data) return <LoopingLogo dark />

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
