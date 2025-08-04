import {
  Button,
  Flex,
  GearTrainIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { SubtabDirectory, SubTabs } from 'components/utils/SubTabs'
import { StackedText } from 'components/utils/table/StackedText'
import { useMemo } from 'react'
import { Link, Outlet, useMatch } from 'react-router-dom'
import {
  AI_ABS_PATH,
  AI_MCP_SERVERS_REL_PATH,
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

const directory: SubtabDirectory = [
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
  const loading = useLoadingDeploymentSettings()
  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(tab), [tab]))

  if (loading) return <LoadingIndicator />

  return (
    <WrapperSC>
      <HeaderSC>
        <StackedText
          first="Plural AI"
          firstPartialType="subtitle1"
          second="View and manage your workspace's AI functionality."
          secondPartialType="body2"
        />
        {aiEnabled && (
          <Flex gap="medium">
            <SubTabs directory={directory} />
            <Button
              secondary
              as={Link}
              startIcon={<GearTrainIcon />}
              to={`${GLOBAL_SETTINGS_ABS_PATH}/ai-provider`}
            >
              AI Settings
            </Button>
          </Flex>
        )}
      </HeaderSC>
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

const HeaderSC = styled.div({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
})
