import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import {
  BellIcon,
  DocumentIcon,
  GearTrainIcon,
  GitPullIcon,
  HistoryIcon,
  HomeIcon,
  KubernetesAltIcon,
  LifePreserverIcon,
  LinksIcon,
  PrOpenIcon,
  SprayIcon,
  StackIcon,
  WarningShieldIcon,
  setThemeColorMode,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { IconProps } from '@pluralsh/design-system/dist/components/icons/createIcon'

import { CD_ABS_PATH } from '../../routes/cdRoutesConsts'
import { STACKS_ROOT_PATH } from '../../routes/stacksRoutesConsts'
import { PR_ABS_PATH } from '../../routes/prRoutesConsts'
import { HOME_ABS_PATH } from '../../routes/consoleRoutesConsts'
import { POLICIES_ABS_PATH } from '../../routes/policiesRoutesConsts'
import { BACKUPS_ABS_PATH } from '../../routes/backupRoutesConsts'
import { NOTIFICATIONS_ABS_PATH } from '../../routes/notificationsRoutesConsts'
import { SETTINGS_ABS_PATH } from '../../routes/settingsRoutesConst'
import { KUBERNETES_ROOT_PATH } from '../../routes/kubernetesRoutesConsts'
import { HelpMenuState, launchHelp } from '../help/HelpLauncher'

type Command = {
  name: string
  icon: React.ComponentType<IconProps>
  action: () => void
  autoFocus?: boolean
}

type CommandGroup = {
  commands: Command[]
  title?: string
}

export function useCommands(): CommandGroup[] {
  const navigate = useNavigate()
  const theme = useTheme()
  const targetThemeColorMode = theme.mode === 'dark' ? 'light' : 'dark'

  return useMemo(
    () => [
      {
        commands: [
          {
            name: 'Home',
            icon: HomeIcon,
            action: () => navigate(HOME_ABS_PATH),
            autoFocus: true,
          },
          {
            name: 'Continuous Deployment (CD)',
            icon: GitPullIcon,
            action: () => navigate(CD_ABS_PATH),
          },
          {
            name: 'Stacks',
            icon: StackIcon,
            action: () => navigate(STACKS_ROOT_PATH),
          },
          {
            name: 'Kubernetes Dashboard',
            icon: KubernetesAltIcon,
            action: () => navigate(KUBERNETES_ROOT_PATH),
          },
          {
            name: 'Pull Requests',
            icon: PrOpenIcon,
            action: () => navigate(PR_ABS_PATH),
          },
          {
            name: 'Policies',
            icon: WarningShieldIcon,
            action: () => navigate(POLICIES_ABS_PATH),
          },
          {
            name: 'Backups',
            icon: HistoryIcon,
            action: () => navigate(BACKUPS_ABS_PATH),
          },
          {
            name: 'Notifications',
            icon: BellIcon,
            action: () => navigate(NOTIFICATIONS_ABS_PATH),
          },
          {
            name: 'Settings',
            icon: GearTrainIcon,
            action: () => navigate(SETTINGS_ABS_PATH),
          },
        ],
      },
      // TODO: Add one more nav group.
      {
        commands: [
          {
            name: 'Open docs',
            icon: DocumentIcon,
            action: () => window.open('https://docs.plural.sh', '_blank'),
          },
          {
            name: 'Help (contact support)',
            icon: LifePreserverIcon,
            action: () => launchHelp(HelpMenuState.intercom),
          },
        ],
      },
      {
        commands: [
          {
            name: 'Copy page link',
            icon: LinksIcon,
            action: () =>
              window.navigator.clipboard.writeText(window.location.href),
          },
          {
            name: `Switch to ${targetThemeColorMode} mode`,
            icon: SprayIcon,
            action: () => setThemeColorMode(targetThemeColorMode),
          },
        ],
      },
    ],
    [navigate, targetThemeColorMode]
  )
}
