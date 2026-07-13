import {
  Button,
  Checkbox,
  Flex,
  GearTrainIcon,
  IconFrame,
  Modal,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import usePersistedState from 'components/hooks/usePersistedState'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { SubtabDirectory, SubTabs } from 'components/utils/SubTabs'
import { useMemo, useState } from 'react'
import { Link, Outlet, useMatch } from 'react-router-dom'
import {
  AI_ABS_PATH,
  AI_AGENT_RUNS_REL_PATH,
  AI_SENTINELS_REL_PATH,
  AI_THREADS_REL_PATH,
} from 'routes/aiRoutesConsts'
import {
  AI_SETTINGS_ABS_PATH,
  AI_SETTINGS_AI_PROVIDER_ABS_PATH,
} from 'routes/settingsRoutesConst'
import styled from 'styled-components'
import {
  useAIEnabled,
  useLoadingDeploymentSettings,
} from '../contexts/DeploymentSettingsContext'
import { AIDisabledState } from './AIThreads'

const DISMISSED_AI_ENABLED_DIALOG_KEY = 'dismissedAIEnabledDialog'

const directory: SubtabDirectory = [
  { label: 'Agent runs', path: AI_AGENT_RUNS_REL_PATH },
  { label: 'Sentinels', path: AI_SENTINELS_REL_PATH },
  { label: 'Chat threads', path: AI_THREADS_REL_PATH },
]

export const getAIBreadcrumbs = (tab: string = '') => [
  { label: 'plural ai', url: AI_ABS_PATH },
  ...getTabCrumb(AI_ABS_PATH, tab),
]

export function AI() {
  const tab = useMatch(`${AI_ABS_PATH}/:tab/*`)?.params.tab
  const aiEnabled = useAIEnabled()
  const [dismissedAIDialog, setDismissedAIDialog] = usePersistedState(
    DISMISSED_AI_ENABLED_DIALOG_KEY,
    false
  )
  const [sessionDismissed, setSessionDismissed] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const showEnableAIDialog =
    aiEnabled === false && !dismissedAIDialog && !sessionDismissed
  const loading = useLoadingDeploymentSettings()
  useSetBreadcrumbs(useMemo(() => getAIBreadcrumbs(tab), [tab]))

  const handleDismiss = () => {
    if (dontShowAgain) setDismissedAIDialog(true)
    else setSessionDismissed(true)
    setDontShowAgain(false)
  }

  return (
    <WrapperSC>
      <HeaderSC>
        <StretchedFlex gap="medium">
          <SubTabs directory={directory} />
          <IconFrame
            clickable
            icon={<GearTrainIcon />}
            as={Link}
            to={AI_SETTINGS_ABS_PATH}
            tooltip="AI Settings"
            type="floating"
          />
        </StretchedFlex>
      </HeaderSC>
      {loading ? (
        <RectangleSkeleton
          $height="100%"
          $width="100%"
        />
      ) : (
        <Outlet />
      )}
      <Modal
        open={showEnableAIDialog}
        header="Enable Plural AI"
        size="large"
        actions={
          <Flex
            align="center"
            gap="medium"
            width="100%"
          >
            <Checkbox
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            >
              Don&apos;t show me this message again
            </Checkbox>
            <Flex
              gap="medium"
              marginLeft="auto"
            >
              <Button
                secondary
                onClick={handleDismiss}
              >
                Dismiss
              </Button>
              <Button
                as={Link}
                to={AI_SETTINGS_AI_PROVIDER_ABS_PATH}
              >
                Go to settings
              </Button>
            </Flex>
          </Flex>
        }
      >
        <AIDisabledState showCta={false} />
      </Modal>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  padding: theme.spacing.large,
  overflow: 'hidden',
  height: '100%',
  width: '100%',
  maxWidth: theme.breakpoints.desktop,
  alignSelf: 'center',
}))

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
}))

export const getTabCrumb = (prefix: string, tab: Nullable<string>) =>
  tab ? [{ label: tab?.split('-').join(' '), url: `${prefix}/${tab}` }] : []
