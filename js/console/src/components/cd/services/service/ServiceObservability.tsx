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
        <ContentSC>
          <Outlet context={ctx} />
        </ContentSC>
      </PageHeaderContext>
    </WrapperSC>
  )
}

// bounded below the tab bar so each subtab scrolls on its own (or fills it, eg the alerts table)
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
