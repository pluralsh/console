import { Breadcrumb, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useCloudSetupUnfinished, useIsManager } from 'components/contexts'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { useTheme } from 'styled-components'
import { AiThreads } from './AiThreads.tsx'
import { ClusterOverviewCard } from './clusteroverview/ClusterOverviewCard'
import { DeploymentsCard } from './deployments/DeploymentsCard'
import { PrCard } from './pullrequests/PrCard'
import { ServiceCatalogs } from './ServiceCatalog.tsx'
import { ConstraintViolationsCard } from './violations/ConstraintViolationsCard'
import { GettingStartedPopup } from './GettingStarted.tsx'
import { useOnboarded } from '../contexts/DeploymentSettingsContext.tsx'

const breadcrumbs: Breadcrumb[] = [{ label: 'home', url: '/' }]

export default function Home() {
  const theme = useTheme()
  const isManager = useIsManager()
  const onboarded = useOnboarded()
  // we don't want a double popup, and this one would come first
  const isCloudSetupUnfinished = useCloudSetupUnfinished()

  useSetBreadcrumbs(breadcrumbs)

  return (
    <>
      {!onboarded && !isCloudSetupUnfinished && <GettingStartedPopup />}
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
          <ServiceCatalogs />
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
    </>
  )
}
