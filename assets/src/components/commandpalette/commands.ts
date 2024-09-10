import {
  ArrowTopRightIcon,
  BellIcon,
  ClusterIcon,
  DocumentIcon,
  EyeIcon,
  GearTrainIcon,
  GitPullIcon,
  HistoryIcon,
  HomeIcon,
  KubernetesAltIcon,
  LifePreserverIcon,
  PeopleIcon,
  PodContainerIcon,
  PrOpenIcon,
  PrQueueIcon,
  SprayIcon,
  StackIcon,
  ToolsIcon,
  WarningShieldIcon,
  setThemeColorMode,
  useThemeColorMode,
} from '@pluralsh/design-system'
import { IconProps } from '@pluralsh/design-system/dist/components/icons/createIcon'
import { UseHotkeysOptions } from '@saas-ui/use-hotkeys'
import { isEmpty } from 'lodash'
import { ComponentType, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useClustersTinyQuery } from '../../generated/graphql'
import { BACKUPS_ABS_PATH } from '../../routes/backupRoutesConsts'
import {
  CD_ABS_PATH,
  CLUSTERS_REL_PATH,
  CLUSTER_PODS_PATH,
  SERVICES_REL_PATH,
  getClusterDetailsPath,
} from '../../routes/cdRoutesConsts'
import { HOME_ABS_PATH } from '../../routes/consoleRoutesConsts'
import { KUBERNETES_ROOT_PATH } from '../../routes/kubernetesRoutesConsts'
import { NOTIFICATIONS_ABS_PATH } from '../../routes/notificationsRoutesConsts'
import { POLICIES_ABS_PATH } from '../../routes/policiesRoutesConsts'
import {
  PR_ABS_PATH,
  PR_AUTOMATIONS_ABS_PATH,
} from '../../routes/prRoutesConsts'
import {
  SETTINGS_ABS_PATH,
  USER_MANAGEMENT_ABS_PATH,
} from '../../routes/settingsRoutesConst'
import { STACKS_ROOT_PATH } from '../../routes/stacksRoutesConsts'
import { mapExistingNodes } from '../../utils/graphql'
import { useProjectId } from '../contexts/ProjectsContext'
import { HelpMenuState, launchHelp } from '../help/HelpLauncher'
import { useShareSecretContext } from '../sharesecret/ShareSecretContext'

type CommandGroup = {
  commands: Command[]
  title?: string
}

export type Command = {
  // Command label.
  label: string

  // Command label prefix.
  prefix?: string

  // Icon to display next to the label in the command palette.
  icon: ComponentType<IconProps>

  // Additional icon that will be displayed on the right side of the label.
  rightIcon?: ComponentType<IconProps>

  // Whether this command should be enabled or not.
  disabled?: boolean

  // Whether this command should be autofocused when the command palette opens.
  // There should be only one command that uses this option.
  autoFocus?: boolean

  // Callback function to execute when the command or assigned hotkeys are used.
  callback: () => void

  // Dependencies of the callback function.
  deps?: any[]

  // Hotkeys that will trigger this command.
  hotkeys?: string[]

  // Hotkeys options.
  options?: UseHotkeysOptions
}

export type CommandWithHotkeys = Command & { hotkeys: string[] }

export const hasHotkeys = (command): command is CommandWithHotkeys =>
  !isEmpty(command.hotkeys)

export function useCommandsWithHotkeys() {
  const commands = useCommands()

  return useMemo(
    () =>
      commands
        .map((group) => group.commands)
        .flat()
        .filter(hasHotkeys),
    [commands]
  )
}

export function useCommands(): CommandGroup[] {
  const { setOpen } = useShareSecretContext()
  const mode = useThemeColorMode()
  const navigate = useNavigate()
  const projectId = useProjectId()

  const { data } = useClustersTinyQuery({
    pollInterval: 120_000,
    fetchPolicy: 'cache-and-network',
    variables: { projectId },
  })

  const clusters = useMemo(
    () => mapExistingNodes(data?.clusters),
    [data?.clusters]
  )

  const cluster = useMemo(
    () => (!isEmpty(clusters) ? clusters[0] : undefined),
    [clusters]
  )

  return useMemo(
    () => [
      {
        commands: [
          {
            label: 'Home',
            icon: HomeIcon,
            callback: () => navigate(HOME_ABS_PATH),
            deps: [navigate],
            hotkeys: ['shift H', '1'],
            autoFocus: true,
          },
          {
            label: 'Continuous Deployment (CD)',
            icon: GitPullIcon,
            callback: () => navigate(CD_ABS_PATH),
            deps: [navigate],
            hotkeys: ['shift C', '2'],
          },
          {
            label: 'Stacks',
            icon: StackIcon,
            callback: () => navigate(STACKS_ROOT_PATH),
            deps: [navigate],
            hotkeys: ['shift S', '3'],
          },
          {
            label: 'Kubernetes Dashboard',
            icon: KubernetesAltIcon,
            callback: () => navigate(KUBERNETES_ROOT_PATH),
            deps: [navigate],
            hotkeys: ['shift K', '4'],
          },
          {
            label: "Pull Requests (PR's)",
            icon: PrOpenIcon,
            callback: () => navigate(PR_ABS_PATH),
            deps: [navigate],
            hotkeys: ['shift P', '5'],
          },
          {
            label: 'Policies',
            icon: WarningShieldIcon,
            callback: () => navigate(POLICIES_ABS_PATH),
            deps: [navigate],
            hotkeys: ['shift L', '6'],
          },
          {
            label: 'Backups',
            icon: HistoryIcon,
            callback: () => navigate(BACKUPS_ABS_PATH),
            deps: [navigate],
            hotkeys: ['shift B', '7'],
          },
          {
            label: 'Notifications',
            icon: BellIcon,
            callback: () => navigate(NOTIFICATIONS_ABS_PATH),
            deps: [navigate],
            hotkeys: ['shift N', '8'],
          },
          {
            label: 'Settings',
            icon: GearTrainIcon,
            callback: () => navigate(SETTINGS_ABS_PATH),
            deps: [navigate],
            hotkeys: ['shift A', '9'],
          },
        ],
      },
      {
        commands: [
          {
            prefix: 'CD >',
            label: 'Clusters',
            icon: ClusterIcon,
            callback: () => navigate(`${CD_ABS_PATH}/${CLUSTERS_REL_PATH}`),
            deps: [navigate],
            hotkeys: ['G then C'],
          },
          {
            prefix: 'CD > Clusters >',
            label: 'Pods',
            icon: PodContainerIcon,
            callback: () => {
              if (cluster?.id)
                navigate(
                  `${getClusterDetailsPath({
                    clusterId: cluster?.id,
                  })}/${CLUSTER_PODS_PATH}`
                )
            },
            deps: [navigate, cluster?.id],
            disabled: !cluster?.id,
            hotkeys: ['G then P'],
          },
          {
            prefix: 'CD >',
            label: 'Services',
            icon: ToolsIcon,
            callback: () => navigate(`${CD_ABS_PATH}/${SERVICES_REL_PATH}`),
            deps: [navigate],
            hotkeys: ['G then S'],
          },
          {
            prefix: "PR's >",
            label: 'PR automations',
            icon: PrQueueIcon,
            callback: () => navigate(PR_AUTOMATIONS_ABS_PATH),
            deps: [navigate],
            hotkeys: ['G then A'],
          },
          {
            prefix: 'Settings >',
            label: 'User management',
            icon: PeopleIcon,
            callback: () => navigate(USER_MANAGEMENT_ABS_PATH),
            deps: [navigate],
            hotkeys: ['G then U'],
          },
        ],
      },
      {
        commands: [
          {
            label: 'Open docs',
            icon: DocumentIcon,
            rightIcon: ArrowTopRightIcon,
            callback: () =>
              window.open('https://docs.plural.sh', '_blank', 'noopener'),
            hotkeys: ['shift D'],
          },
          {
            label: 'Help (contact support)',
            icon: LifePreserverIcon,
            rightIcon: ArrowTopRightIcon,
            callback: () => launchHelp(HelpMenuState.intercom),
            hotkeys: ['shift I'],
          },
        ],
      },
      {
        commands: [
          {
            label: 'Share secret',
            icon: EyeIcon,
            callback: () => setOpen(true),
            options: { preventDefault: true },
            hotkeys: ['C then S'],
          },
          {
            label: `Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`,
            icon: SprayIcon,
            callback: () =>
              setThemeColorMode(mode === 'dark' ? 'light' : 'dark'),
            deps: [mode],
            options: { preventDefault: true },
            hotkeys: ['shift T'],
          },
        ],
      },
    ],
    [navigate, cluster?.id, mode, setOpen]
  )
}
