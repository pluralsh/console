import { PageHeaderContext } from 'components/cd/ContinuousDeployment'
import { useMetricsEnabled } from 'components/contexts/DeploymentSettingsContext'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { SubTabs } from 'components/utils/SubTabs'
import { ReactNode, useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import styled from 'styled-components'
import { useServiceSubPageBreadcrumbs } from './ServiceDetails'
import { useServiceContext } from './ServiceDetailsContext'
import { SERVICE_OBSERVABILITY_REL_PATH } from 'routes/cdRoutesConsts'

export function ServiceObservability() {
  const ctx = useServiceContext()
  useServiceSubPageBreadcrumbs(SERVICE_OBSERVABILITY_REL_PATH)
  const metricsEnabled = useMetricsEnabled()

  const directory = useMemo(
    () => [
      { path: 'alerts', label: 'Alerts' },
      ...(metricsEnabled ? [{ path: 'metrics', label: 'Metrics' }] : []),
      { path: 'monitors', label: 'Monitors' },
    ],
    [metricsEnabled]
  )

  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const pageHeaderCtx = useMemo(
    () => ({ setHeaderContent }),
    [setHeaderContent]
  )

  return (
    <WrapperSC>
      <StretchedFlex>
        <SubTabs directory={directory} />
        {headerContent}
      </StretchedFlex>
      <PageHeaderContext value={pageHeaderCtx}>
        <Outlet context={ctx} />
      </PageHeaderContext>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  height: '100%',
  paddingBottom: theme.spacing.medium,
}))
