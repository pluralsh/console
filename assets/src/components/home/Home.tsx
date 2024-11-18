import { Breadcrumb, useSetBreadcrumbs } from '@pluralsh/design-system'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import styled, { useTheme } from 'styled-components'

import { useIsManager, useLogin } from 'components/contexts'

import ConsolePageTitle from 'components/utils/layout/ConsolePageTitle'

import { ClusterOverviewCard } from './clusteroverview/ClusterOverviewCard'
// import { MonthlyClusterCostsCard } from './MonthlyClusterCostsCard'
import { DeploymentsCard } from './deployments/DeploymentsCard'

import { ConstraintViolationsCard } from './managerview/violations/ConstraintViolationsCard'
import { PrCard } from './pullrequests/PrCard'

const breadcrumbs: Breadcrumb[] = [{ label: 'home', url: '/' }]

export default function Home() {
  useSetBreadcrumbs(breadcrumbs)
  const theme = useTheme()
  const name = useLogin().me?.name
  const isManager = useIsManager()

  return (
    <ResponsivePageFullWidth style={{ paddingTop: 0 }}>
      <ConsolePageTitle
        headingProps={{ title2: false, title1: true }}
        heading={`Welcome${name ? `, ${name.split(' ')[0]}` : ''}!`}
      />
      <HomeContentWrapperSC>
        <ClusterOverviewCard />
        {isManager && <ConstraintViolationsCard />}
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.large,

            '@media (min-width: 1168px)': {
              flexDirection: 'row',
            },
          }}
        >
          <PrCard />
          <DeploymentsCard />
        </div>
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
