import {
  GearTrainIcon,
  IconFrame,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { FeatureFlagContext } from 'components/flows/FeatureFlagContext'
import { SubTabs } from 'components/utils/SubTabs'
import { use, useMemo } from 'react'
import { Link, Outlet, useMatch } from 'react-router-dom'
import {
  AI_ABS_PATH,
  AI_AGENT_RUNS_REL_PATH,
  AI_AGENT_RUNTIMES_REL_PATH,
  AI_AGENT_SESSIONS_REL_PATH,
  AI_MCP_SERVERS_REL_PATH,
  AI_SENTINELS_REL_PATH,
  AI_THREADS_REL_PATH,
} from 'routes/aiRoutesConsts'
import { GLOBAL_SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'
import styled from 'styled-components'
import {
  useAIEnabled,
  useLoadingDeploymentSettings,
} from '../contexts/DeploymentSettingsContext'
import LoadingIndicator from '../utils/LoadingIndicator'
import { AIDisabledState } from './AIThreads'

const getDirectory = (agentEnabled: boolean) => [
  { label: 'Agent sessions', path: AI_AGENT_SESSIONS_REL_PATH },
  { label: 'Sentinels', path: AI_SENTINELS_REL_PATH },
  { label: 'Chat threads', path: AI_THREADS_REL_PATH },
  { label: 'MCP servers', path: AI_MCP_SERVERS_REL_PATH },
  ...(agentEnabled
    ? [
        { label: 'Agent runtimes', path: AI_AGENT_RUNTIMES_REL_PATH },
        { label: 'Agent runs', path: AI_AGENT_RUNS_REL_PATH },
      ]
    : []),
]

export const getAIBreadcrumbs = (tab: string = '') => [
  { label: 'plural ai', url: AI_ABS_PATH },
  { label: tab.split('-').join(' '), url: `${AI_ABS_PATH}/${tab}` },
]

export function AI() {
  const tab = useMatch(`${AI_ABS_PATH}/:tab/*`)?.params.tab
  const aiEnabled = useAIEnabled()
  const loading = useLoadingDeploymentSettings()
  const agentEnabled = !!use(FeatureFlagContext).featureFlags.Agent
  useSetBreadcrumbs(useMemo(() => getAIBreadcrumbs(tab), [tab]))

  if (loading) return <LoadingIndicator />

  return (
    <WrapperSC>
      {aiEnabled && (
        <HeaderSC>
          <SubTabs directory={getDirectory(agentEnabled)} />
          <IconFrame
            clickable
            icon={<GearTrainIcon />}
            as={Link}
            to={`${GLOBAL_SETTINGS_ABS_PATH}/ai-provider`}
            tooltip="AI Settings"
            type="floating"
          />
        </HeaderSC>
      )}
      {aiEnabled ? <Outlet /> : <AIDisabledState />}
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xlarge,
  padding: theme.spacing.large,
  overflow: 'hidden',
  height: '100%',
  width: '100%',
  maxWidth: theme.breakpoints.desktop,
  alignSelf: 'center',
}))

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: theme.spacing.medium,
}))
