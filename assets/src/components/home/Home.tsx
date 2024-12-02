import { Breadcrumb, useSetBreadcrumbs } from '@pluralsh/design-system'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { useTheme } from 'styled-components'
import { useIsManager } from 'components/contexts'
import { ClusterOverviewCard } from './clusteroverview/ClusterOverviewCard'
import { DeploymentsCard } from './deployments/DeploymentsCard'
import { ConstraintViolationsCard } from './violations/ConstraintViolationsCard'
import { PrCard } from './pullrequests/PrCard'
import { AiThreads } from './AiThreads.tsx'
import { ServiceCatalog } from './ServiceCatalog.tsx'

const breadcrumbs: Breadcrumb[] = [{ label: 'home', url: '/' }]

export default function Home() {
  const theme = useTheme()
  const isManager = useIsManager()

  useSetBreadcrumbs(breadcrumbs)

  return (
    <ResponsivePageFullWidth maxContentWidth={1440}>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.large,
          paddingBottom: theme.spacing.large,
        }}
      >
        <ClusterOverviewCard />
        <ServiceCatalog />
        <AiThreads />
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
      </div>
    </ResponsivePageFullWidth>
  )
}
