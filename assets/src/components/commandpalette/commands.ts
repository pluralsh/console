import { useNavigate } from 'react-router-dom'
import { ComponentType, useMemo } from 'react'
import {
  ArrowTopRightIcon,
  BellIcon,
  ClusterIcon,
  DocumentIcon,
  GearTrainIcon,
  GitPullIcon,
  HistoryIcon,
  HomeIcon,
  KubernetesAltIcon,
  LifePreserverIcon,
  LinksIcon,
  PeopleIcon,
  PrOpenIcon,
  PrQueueIcon,
  SprayIcon,
  StackIcon,
  ToolsIcon,
  WarningShieldIcon,
  setThemeColorMode,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { IconProps } from '@pluralsh/design-system/dist/components/icons/createIcon'
import { isEmpty } from 'lodash'

import {
  CD_ABS_PATH,
  CLUSTERS_REL_PATH,
  CLUSTER_PODS_PATH,
  SERVICES_REL_PATH,
  getClusterDetailsPath,
} from '../../routes/cdRoutesConsts'
import { STACKS_ROOT_PATH } from '../../routes/stacksRoutesConsts'
import {
  PR_ABS_PATH,
  PR_AUTOMATIONS_ABS_PATH,
} from '../../routes/prRoutesConsts'
import { HOME_ABS_PATH } from '../../routes/consoleRoutesConsts'
import { POLICIES_ABS_PATH } from '../../routes/policiesRoutesConsts'
import { BACKUPS_ABS_PATH } from '../../routes/backupRoutesConsts'
import { NOTIFICATIONS_ABS_PATH } from '../../routes/notificationsRoutesConsts'
import {
  SETTINGS_ABS_PATH,
  USER_MANAGEMENT_ABS_PATH,
} from '../../routes/settingsRoutesConst'
import { KUBERNETES_ROOT_PATH } from '../../routes/kubernetesRoutesConsts'
import { HelpMenuState, launchHelp } from '../help/HelpLauncher'
import { useClustersTinyQuery } from '../../generated/graphql'
import { useProjectId } from '../contexts/ProjectsContext'
import { mapExistingNodes } from '../../utils/graphql'

type Command = {
  prefix?: string
  label: string
  icon: ComponentType<IconProps>
  rightIcon?: ComponentType<IconProps>
  shortcuts?: string[]
  action: () => void
  disabled?: boolean
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
            action: () => navigate(HOME_ABS_PATH),
            shortcuts: ['H', '1'],
            autoFocus: true,
          },
          {
            label: 'Continuous Deployment (CD)',
            icon: GitPullIcon,
            action: () => navigate(CD_ABS_PATH),
            shortcuts: ['C', '2'],
          },
          {
            label: 'Stacks',
            icon: StackIcon,
            action: () => navigate(STACKS_ROOT_PATH),
            shortcuts: ['S', '3'],
          },
          {
            label: 'Kubernetes Dashboard',
            icon: KubernetesAltIcon,
            action: () => navigate(KUBERNETES_ROOT_PATH),
            shortcuts: ['K', '4'],
          },
          {
            label: 'Pull Requests (PR’s)',
            icon: PrOpenIcon,
            action: () => navigate(PR_ABS_PATH),
            shortcuts: ['P', '5'],
          },
          {
            label: 'Policies',
            icon: WarningShieldIcon,
            action: () => navigate(POLICIES_ABS_PATH),
            shortcuts: ['L', '6'],
          },
          {
            label: 'Backups',
            icon: HistoryIcon,
            action: () => navigate(BACKUPS_ABS_PATH),
            shortcuts: ['B', '7'],
          },
          {
            label: 'Notifications',
            icon: BellIcon,
            action: () => navigate(NOTIFICATIONS_ABS_PATH),
            shortcuts: ['N', '8'],
          },
          {
            label: 'Settings',
            icon: GearTrainIcon,
            action: () => navigate(SETTINGS_ABS_PATH),
            shortcuts: ['A', '9'],
          },
        ],
      },
      {
        commands: [
          {
            prefix: 'CD >',
            label: 'Clusters',
            icon: ClusterIcon,
            action: () => navigate(`${CD_ABS_PATH}/${CLUSTERS_REL_PATH}`),
            shortcuts: ['G then C'],
          },
          {
            prefix: 'CD > Clusters >',
            label: 'Pods',
            icon: ClusterIcon, // TODO
            action: () =>
              navigate(
                `${getClusterDetailsPath({
                  clusterId: cluster?.id,
                })}/${CLUSTER_PODS_PATH}`
              ),
            disabled: !cluster?.id,
            shortcuts: ['G then P'],
          },
          {
            prefix: 'CD >',
            label: 'Services',
            icon: ToolsIcon,
            action: () => navigate(`${CD_ABS_PATH}/${SERVICES_REL_PATH}`),
            shortcuts: ['G then S'],
          },
          {
            prefix: 'PR’s >',
            label: 'PR automations',
            icon: PrQueueIcon,
            action: () => navigate(PR_AUTOMATIONS_ABS_PATH),
            shortcuts: ['G then A'],
          },
          {
            prefix: 'Settings >',
            label: 'User management',
            icon: PeopleIcon,
            action: () => navigate(USER_MANAGEMENT_ABS_PATH),
            shortcuts: ['G then U'],
          },
        ],
      },
      {
        commands: [
          {
            label: 'Open docs',
            icon: DocumentIcon,
            rightIcon: ArrowTopRightIcon,
            action: () => window.open('https://docs.plural.sh', '_blank'),
            shortcuts: ['shift D'],
          },
          {
            label: 'Help (contact support)',
            icon: LifePreserverIcon,
            rightIcon: ArrowTopRightIcon,
            action: () => launchHelp(HelpMenuState.intercom),
            shortcuts: ['shift H'],
          },
        ],
      },
      {
        commands: [
          {
            label: 'Copy page link',
            icon: LinksIcon,
            action: () =>
              window.navigator.clipboard.writeText(window.location.href),
            shortcuts: ['shift L'],
          },
          {
            label: `Switch to ${targetThemeColorMode} mode`,
            icon: SprayIcon,
            action: () => setThemeColorMode(targetThemeColorMode), // TODO
            shortcuts: ['shift T'],
          },
        ],
      },
    ],
    [cluster?.id, navigate, targetThemeColorMode]
  )
}
