import { PageHeaderContext } from 'components/cd/ContinuousDeployment'
import {
  useLoadingDeploymentSettings,
  useMetricsEnabled,
} from 'components/contexts/DeploymentSettingsContext'
import { PageToolbarPortal, ToolbarTabs } from 'components/layout/PageToolbar'
import { ReactNode, useMemo, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { useServiceSubPageBreadcrumbs } from './ServiceDetails'
import {
  ServiceToolbarStartPortal,
  useServiceContext,
} from './ServiceDetailsContext'
import { SERVICE_OBSERVABILITY_REL_PATH } from 'routes/cdRoutesConsts'

export function ServiceObservabilityIndex() {
  const metricsEnabled = useMetricsEnabled()
  const loading = useLoadingDeploymentSettings()

  if (loading) return null

  return (
    <Navigate
      replace
      to={metricsEnabled ? 'metrics' : 'alerts'}
    />
  )
}

export function ServiceObservability() {
  const ctx = useServiceContext()
  useServiceSubPageBreadcrumbs(SERVICE_OBSERVABILITY_REL_PATH)
  const metricsEnabled = useMetricsEnabled()
  const { pathname } = useLocation()

  const directory = useMemo(
    () => [
      ...(metricsEnabled ? [{ path: 'metrics', label: 'Metrics' }] : []),
      { path: 'alerts', label: 'Alerts' },
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
      <ServiceToolbarStartPortal>
        <ToolbarTabs
          directory={directory}
          activeFn={(path) => pathname.split('/').includes(path)}
        />
      </ServiceToolbarStartPortal>
      {headerContent && <PageToolbarPortal>{headerContent}</PageToolbarPortal>}
      <PageHeaderContext value={pageHeaderCtx}>
        <ContentSC>
          <Outlet context={ctx} />
        </ContentSC>
      </PageHeaderContext>
    </WrapperSC>
  )
}

// bounded so each subtab scrolls on its own (or fills it, eg the alerts table)
const ContentSC = styled.div({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
  overflowY: 'auto',
})

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  height: '100%',
  minWidth: 0,
  paddingBottom: theme.spacing.medium,
}))
