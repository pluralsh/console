import { PageHeaderContext } from 'components/cd/ContinuousDeployment'
import { SubTabs } from 'components/utils/SubTabs'
import { Outlet } from 'react-router-dom'

import { useMetricsEnabled } from 'components/contexts/DeploymentSettingsContext'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { ReactNode, useMemo, useState } from 'react'
import styled from 'styled-components'
import { useServiceContext } from './ServiceDetailsContext'

export function ServiceObservability() {
  const ctx = useServiceContext()
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
