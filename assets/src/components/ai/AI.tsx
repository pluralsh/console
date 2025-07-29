import {
  GearTrainIcon,
  IconFrame,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { SubtabDirectory, SubTabs } from 'components/utils/SubTabs'
import { useMemo } from 'react'
import { Link, Outlet, useMatch } from 'react-router-dom'
import {
  AI_ABS_PATH,
  AI_AGENT_REL_PATH,
  AI_MCP_SERVERS_REL_PATH,
  AI_THREADS_REL_PATH,
} from 'routes/aiRoutesConsts'
import { GLOBAL_SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'
import styled from 'styled-components'
import { useAIEnabled } from '../contexts/DeploymentSettingsContext'
import LoadingIndicator from '../utils/LoadingIndicator'
import { AIDisabledState } from './AIThreads'

const directory: SubtabDirectory = [
  { label: 'Agent', path: AI_AGENT_REL_PATH },
  { label: 'Threads', path: AI_THREADS_REL_PATH },
  { label: 'MCP servers', path: AI_MCP_SERVERS_REL_PATH },
]

const getBreadcrumbs = (tab: string = '') => [
  { label: 'plural-ai', url: AI_ABS_PATH },
  { label: tab, url: `${AI_ABS_PATH}/${tab}` },
]

export function AI() {
  const tab = useMatch(`${AI_ABS_PATH}/:tab/*`)?.params.tab
  const aiEnabled = useAIEnabled()
  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(tab), [tab]))

  if (aiEnabled === undefined) return <LoadingIndicator />

  return (
    <WrapperSC>
      {aiEnabled && (
        <HeaderSC>
          <SubTabs directory={directory} />
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
