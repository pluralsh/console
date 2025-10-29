import {
  AiSparkleOutlineIcon,
  CatalogIcon,
  ChatOutlineIcon,
  ClusterIcon,
  CostManagementIcon,
  DocumentIcon,
  EdgeComputeIcon,
  EyeIcon,
  FlowIcon,
  GearTrainIcon,
  GitPullIcon,
  HomeIcon,
  IconProps,
  KubernetesAltIcon,
  PeopleIcon,
  PodContainerIcon,
  PrOpenIcon,
  PrQueueIcon,
  RobotIcon,
  setThemeColorMode,
  SprayIcon,
  StackIcon,
  ToolsIcon,
  useThemeColorMode,
  WarningShieldIcon,
} from '@pluralsh/design-system'
import { UseHotkeysOptions } from '@saas-ui/use-hotkeys'
import { useChatbot } from 'components/ai/AIContext.tsx'
import { FeatureFlagContext } from 'components/flows/FeatureFlagContext.tsx'
import Fuse from 'fuse.js'
import { isEmpty } from 'lodash'
import { ComponentType, Dispatch, ReactElement, use, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useThrottle } from 'components/hooks/useThrottle.tsx'
import { COST_MANAGEMENT_ABS_PATH } from 'routes/costManagementRoutesConsts.tsx'
import { FLOWS_ABS_PATH } from 'routes/flowRoutesConsts.tsx'
import {
  ChatThreadTinyFragment,
  PageInfoFragment,
  useChatThreadsQuery,
  useClustersTinyQuery,
} from '../../generated/graphql'
import { AI_ABS_PATH } from '../../routes/aiRoutesConsts'
import {
  CD_ABS_PATH,
  CLUSTERS_REL_PATH,
  getClusterDetailsPath,
  PODS_REL_PATH,
  SERVICES_REL_PATH,
} from '../../routes/cdRoutesConsts'
import { EDGE_ABS_PATH } from '../../routes/edgeRoutes.tsx'
import { KUBERNETES_ROOT_PATH } from '../../routes/kubernetesRoutesConsts'
import { SECURITY_ABS_PATH } from '../../routes/securityRoutesConsts.tsx'
import {
  CATALOGS_ABS_PATH,
  PR_ABS_PATH,
  PR_AUTOMATIONS_ABS_PATH,
} from '../../routes/selfServiceRoutesConsts.tsx'
import {
  SETTINGS_ABS_PATH,
  USER_MANAGEMENT_ABS_PATH,
} from '../../routes/settingsRoutesConst'
import { STACKS_ROOT_PATH } from '../../routes/stacksRoutesConsts'
import { mapExistingNodes } from '../../utils/graphql'
import { useProjectId } from '../contexts/ProjectsContext'
import { useShareSecretOpen } from '../sharesecret/ShareSecretContext'
import { useFetchPaginatedData } from '../utils/table/useFetchPaginatedData.tsx'
import { CommandPaletteContext } from './CommandPaletteContext.tsx'

export type CommandGroup = {
  commands: Command[]
  title?: string
}

export type Command = {
  // Command unique id.
  id: string

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

  // Component allows providing a custom React element to be rendered in the command palette.
  component?: ReactElement

  // Hotkeys options.
  options?: UseHotkeysOptions
}

export type CommandWithHotkeys = Command & { hotkeys: string[] }

export const hasHotkeys = (command): command is CommandWithHotkeys =>
  !isEmpty(command.hotkeys)

// just used for creating the hotkey listeners, not for displaying the commands in the palette
export function useCommandsWithHotkeys() {
  const commands = useCommands({ showHidden: true })

  return useMemo(
    () =>
      commands
        .map((group) => group.commands)
        .flat()
        .filter(hasHotkeys),
    [commands]
  )
}

export function useCommands({
  showHidden = false,
  filter = '',
}: {
  showHidden?: boolean
  filter?: string
}): CommandGroup[] {
  const open = useShareSecretOpen()
  const { setDocsSearchOpen } = use(CommandPaletteContext)
  const mode = useThemeColorMode()
  const navigate = useNavigate()
  const projectId = useProjectId()
  const { featureFlags, setFeatureFlag } = use(FeatureFlagContext)

  const { data } = useClustersTinyQuery({
    pollInterval: 120_000,
    fetchPolicy: 'cache-and-network',
    variables: { projectId, first: 100 },
  })

  const cluster = useMemo(() => {
    const clusters = mapExistingNodes(data?.clusters)

    return !isEmpty(clusters)
      ? (clusters.find(({ self }) => !!self) ?? clusters[0])
      : undefined
  }, [data?.clusters])

  const hiddenCommands = useMemo(
    () => [
      {
        commands: [
          ...(!featureFlags.Edge
            ? [
                {
                  id: 'enable-edge',
                  label: 'Enable Edge',
                  icon: EdgeComputeIcon,
                  callback: () => setFeatureFlag('Edge', true),
                  deps: [setFeatureFlag],
                },
              ]
            : []),
          ...(!featureFlags.Agent
            ? [
                {
                  id: 'enable-agent',
                  label: 'Enable Agent',
                  icon: RobotIcon,
                  callback: () => setFeatureFlag('Agent', true),
                  deps: [setFeatureFlag],
                },
              ]
            : []),
        ],
      },
    ],
    [featureFlags, setFeatureFlag]
  )

  const commands = useMemo(
    () => [
      {
        commands: [
          {
            id: 'home',
            label: 'Home',
            icon: HomeIcon,
            callback: () => navigate('/'),
            deps: [navigate],
            hotkeys: ['shift H'],
            autoFocus: true,
          },
          {
            id: 'cd',
            label: 'Continuous deployment (CD)',
            icon: GitPullIcon,
            callback: () => navigate(CD_ABS_PATH),
            deps: [navigate],
            hotkeys: ['shift C'],
          },
          {
            id: 'stacks',
            label: 'Stacks',
            icon: StackIcon,
            callback: () => navigate(STACKS_ROOT_PATH),
            deps: [navigate],
            hotkeys: ['shift S'],
          },
          {
            id: 'service-catalog',
            label: 'Service catalog',
            icon: CatalogIcon,
            callback: () => navigate(CATALOGS_ABS_PATH),
            deps: [navigate],
            hotkeys: ['shift S+C'],
          },
          {
            id: 'kubernetes-dashboard',
            label: 'Kubernetes Dashboard',
            icon: KubernetesAltIcon,
            callback: () => navigate(KUBERNETES_ROOT_PATH),
            deps: [navigate],
            hotkeys: ['shift K'],
          },
          {
            id: 'plural-ai',
            label: 'Plural AI',
            icon: AiSparkleOutlineIcon,
            callback: () => navigate(AI_ABS_PATH),
            deps: [navigate],
            hotkeys: ['shift A'],
          },

          {
            id: 'flows',
            label: 'Flows',
            icon: FlowIcon,
            callback: () => navigate(FLOWS_ABS_PATH),
            deps: [navigate],
            hotkeys: ['shift F'],
          },
          ...(featureFlags.Edge
            ? [
                {
                  id: 'edge',
                  label: 'Edge',
                  icon: EdgeComputeIcon,
                  callback: () => navigate(EDGE_ABS_PATH),
                  deps: [navigate],
                  hotkeys: ['shift E'],
                },
              ]
            : []),
          {
            id: 'pull-requests',
            label: "Pull requests (PR's)",
            icon: PrOpenIcon,
            callback: () => navigate(PR_ABS_PATH),
            deps: [navigate],
            hotkeys: ['shift P+R'],
          },
          {
            id: 'security',
            label: 'Security',
            icon: WarningShieldIcon,
            callback: () => navigate(SECURITY_ABS_PATH),
            deps: [navigate],
          },
          {
            id: 'cost-management',
            label: 'Cost Management',
            icon: CostManagementIcon,
            callback: () => navigate(COST_MANAGEMENT_ABS_PATH),
            deps: [navigate],
            hotkeys: ['shift C+M'],
          },
          {
            id: 'settings',
            label: 'Settings',
            icon: GearTrainIcon,
            callback: () => navigate(SETTINGS_ABS_PATH),
            deps: [navigate],
          },
        ],
      },
      {
        commands: [
          {
            id: 'clusters',
            prefix: 'CD >',
            label: 'Clusters',
            icon: ClusterIcon,
            callback: () => navigate(`${CD_ABS_PATH}/${CLUSTERS_REL_PATH}`),
            deps: [navigate],
            hotkeys: ['G then C'],
          },
          {
            id: 'pods',
            prefix: 'CD > Clusters >',
            label: 'Pods',
            icon: PodContainerIcon,
            callback: () => {
              if (cluster?.id)
                navigate(
                  `${getClusterDetailsPath({
                    clusterId: cluster?.id,
                  })}/${PODS_REL_PATH}`
                )
            },
            deps: [navigate, cluster?.id],
            disabled: !cluster?.id,
            hotkeys: ['G then P'],
          },
          {
            id: 'services',
            prefix: 'CD >',
            label: 'Services',
            icon: ToolsIcon,
            callback: () => navigate(`${CD_ABS_PATH}/${SERVICES_REL_PATH}`),
            deps: [navigate],
            hotkeys: ['G then S'],
          },
          {
            id: 'pr-automations',
            prefix: "PR's >",
            label: 'PR automations',
            icon: PrQueueIcon,
            callback: () => navigate(PR_AUTOMATIONS_ABS_PATH),
            deps: [navigate],
            hotkeys: ['G then A'],
          },
          {
            id: 'user-management',
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
            id: 'search-docs',
            label: 'Search docs',
            icon: DocumentIcon,
            callback: () => setDocsSearchOpen(true),
            hotkeys: ['shift D'],
          },
        ],
      },
      {
        commands: [
          {
            id: 'share-secret',
            label: 'Share secret',
            icon: EyeIcon,
            callback: open,
            options: { preventDefault: true },
            hotkeys: ['C then S'],
          },
          {
            id: 'switch-mode',
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
      ...(showHidden ? hiddenCommands : []),
    ],
    [
      navigate,
      featureFlags.Edge,
      cluster?.id,
      open,
      mode,
      showHidden,
      hiddenCommands,
      setDocsSearchOpen,
    ]
  )

  return useMemo(() => {
    return commands.map((group) => {
      const fuse = new Fuse(group.commands as Array<Command>, {
        keys: ['label', 'prefix'],
        threshold: 0.3,
      })

      return {
        ...group,
        commands:
          filter?.length > 0
            ? fuse.search(filter).map((result) => result.item)
            : group.commands,
      }
    })
  }, [commands, filter])
}

export function useHistory({
  filter,
  component,
}: {
  filter: string
  component?: (thread: ChatThreadTinyFragment) => ReactElement
}): {
  loading: boolean
  history: Command[]
  fetchNextPage: Dispatch<void>
  pageInfo: PageInfoFragment
} {
  const { goToThread } = useChatbot()

  const throttledFilter = useThrottle(filter, 300)
  const { loading, data, fetchNextPage, pageInfo } = useFetchPaginatedData(
    {
      pollInterval: 60_000,
      queryHook: useChatThreadsQuery,
      keyPath: ['chatThreads'],
      pageSize: 50,
    },
    { q: isEmpty(throttledFilter) ? undefined : throttledFilter }
  )

  const threads = useMemo(
    () => mapExistingNodes(data?.chatThreads),
    [data?.chatThreads]
  )
  const history = threads.map((thread) => {
    return {
      id: thread.id,
      label: thread.summary,
      icon: ChatOutlineIcon,
      callback: () => {
        if (thread?.id) goToThread(thread.id)
      },
      deps: [],
      disabled: false,
      component: component?.(thread as ChatThreadTinyFragment),
    } as Command
  })

  return {
    loading: loading && !data,
    history,
    fetchNextPage,
    pageInfo,
  }
}
