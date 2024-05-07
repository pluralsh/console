import { Breadcrumb, useSetBreadcrumbs } from '@pluralsh/design-system'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import styled from 'styled-components'

import { useContext } from 'react'

import { LoginContext } from 'components/contexts'

import ConsolePageTitle from 'components/utils/layout/ConsolePageTitle'

import { ClusterOverviewCard } from './clusteroverview/ClusterOverviewCard'
// import { MonthlyClusterCostsCard } from './MonthlyClusterCostsCard'
import { DeploymentsCard } from './deployments/DeploymentsCard'

import { PrCard } from './pullrequests/PrCard'

const breadcrumbs: Breadcrumb[] = [{ label: 'home', url: '/' }]

export default function Home() {
  useSetBreadcrumbs(breadcrumbs)
  const { me } = useContext(LoginContext)

  return (
    <ResponsivePageFullWidth>
      <ConsolePageTitle
        headingProps={{ title2: false, title1: true }}
        heading={`Welcome${me ? `, ${me.name.split(' ')[0]}` : ''}!`}
      />
      <HomeContentWrapperSC>
        <ClusterOverviewCard />
        <PrCard />
        <DeploymentsCard />
        {/* <MonthlyClusterCostsCard /> */}
      </HomeContentWrapperSC>
    </ResponsivePageFullWidth>
  )
}

const HomeContentWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xlarge,
  marginTop: theme.spacing.large,
  paddingBottom: theme.spacing.xxlarge,
}))
