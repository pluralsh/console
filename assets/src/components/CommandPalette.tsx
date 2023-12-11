import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarResults,
  KBarSearch,
  createAction,
  useKBar,
  useMatches,
  useRegisterActions,
} from 'kbar'
import { type Merge } from 'type-fest'
import {
  ComponentProps,
  Fragment,
  ReactElement,
  ReactNode,
  Ref,
  cloneElement,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
} from 'react'

import {
  ApiIcon,
  ChatIcon,
  Chip,
  CloudIcon,
  ClusterIcon,
  ComponentsIcon,
  DashboardIcon,
  DocumentIcon,
  GearTrainIcon,
  GitHubLogoIcon,
  GitPullIcon,
  LifePreserverIcon,
  LogsIcon,
  MarketPlusIcon,
  PipelineIcon,
  RunBookIcon,
  ServersIcon,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'
import { Flex, Span } from 'honorable'
import styled, { createGlobalStyle, useTheme } from 'styled-components'

import {
  ADDONS_REL_PATH,
  CD_ABS_PATH,
  CLUSTERS_REL_PATH,
  PIPELINES_REL_PATH,
  PROVIDERS_REL_PATH,
  REPOS_REL_PATH,
  SERVICES_REL_PATH,
} from 'routes/cdRoutesConsts'
import {
  ClusterAddOnFragment,
  ClusterTinyFragment,
  useClustersTinyQuery,
} from 'generated/graphql'
import { Edges } from 'utils/graphql'

import { toNiceVersion } from 'utils/semver'

import { getIcon, hasIcons } from './apps/misc'
import { InstallationContext } from './Installations'
import AppStatus from './apps/AppStatus'
import { usePlatform } from './hooks/usePlatform'
import { HelpMenuState, launchHelp } from './help/HelpLauncher'

export enum PaletteSection {
  Actions = 'Actions',
  Apps = 'Apps',
  Cluster = 'Cluster',
  Help = 'Help',
  Security = 'Security',
  Account = 'Account',
  Cd = 'Continuous Deployment (CD)',
  CdClusters = 'CD – Clusters',
  Addons = 'Add-ons',
}

function buildAppActions(applications, nav) {
  return applications
    .map((app) => [
      {
        id: app.name,
        name: app.name,
        app,
        icon: hasIcons(app) ? <AppIcon src={getIcon(app)} /> : null,
        shortcut: [],
        section: PaletteSection.Apps,
      },
      {
        id: `${app.name}-launch`,
        name: `launch ${app.name}`,
        shortcut: [],
        parent: app.name,
        section: app.name,
        perform: () => {
          window.location.href = `https://${app.spec.descriptor.links[0].url}`
        },
      },
      {
        id: `${app.name}-logs`,
        name: `${app.name} logs`,
        icon: <LogsIcon />,
        shortcut: [],
        parent: app.name,
        section: app.name,
        perform: () => nav(`/apps/${app.name}/logs`),
      },
      {
        id: `${app.name}-docs`,
        name: `${app.name} docs`,
        icon: <DocumentIcon />,
        shortcut: [],
        parent: app.name,
        section: app.name,
        perform: () => nav(`/apps/${app.name}/docs`),
      },
      {
        id: `${app.name}-configuration`,
        name: `${app.name} configuration`,
        icon: <GearTrainIcon />,
        shortcut: [],
        parent: app.name,
        section: app.name,
        perform: () => nav(`/apps/${app.name}/config`),
      },
      {
        id: `${app.name}-runbooks`,
        name: `${app.name} runbooks`,
        icon: <RunBookIcon />,
        shortcut: [],
        parent: app.name,
        section: app.name,
        perform: () => nav(`/apps/${app.name}/runbooks`),
      },
      {
        id: `${app.name}-components`,
        name: `${app.name} components`,
        icon: <ComponentsIcon />,
        shortcut: [],
        parent: app.name,
        section: app.name,
        perform: () => nav(`/apps/${app.name}/components`),
      },
      {
        id: `${app.name}-dashboards`,
        name: `${app.name} dashboards`,
        icon: <DashboardIcon />,
        shortcut: [],
        parent: app.name,
        section: app.name,
        perform: () => nav(`/apps/${app.name}/dashboards`),
      },
    ])
    .flat()
}

const clusterDefaultProps = (
  cluster: ClusterTinyFragment,
  sectionName?: string
) => ({
  id: `${cluster.id}${sectionName ? `-${sectionName?.toLowerCase()}` : ''}`,
  name: sectionName || cluster.name,
  section: `${PaletteSection.CdClusters}`,
  ...(sectionName ? { parent: cluster.id } : {}),
})

function buildClusterActions(
  clusters: Nullable<Edges<ClusterTinyFragment>>,
  nav: ReturnType<typeof useNavigate>
) {
  return (
    clusters?.map((edge) => {
      const cluster = edge?.node

      if (!cluster) {
        return []
      }

      const ret = [
        {
          ...clusterDefaultProps(cluster),
          icon: <ClusterIcon />,
        },
        {
          ...clusterDefaultProps(cluster, 'Services'),
          perform: () =>
            nav(
              `${CD_ABS_PATH}/${CLUSTERS_REL_PATH}/${cluster.id}/${SERVICES_REL_PATH}`
            ),
        },
        {
          ...clusterDefaultProps(cluster, 'Nodes'),
          perform: () =>
            nav(`${CD_ABS_PATH}/${CLUSTERS_REL_PATH}/${cluster.id}/nodes}`),
        },
        {
          ...clusterDefaultProps(cluster, 'Pods'),
          perform: () =>
            nav(`${CD_ABS_PATH}/${CLUSTERS_REL_PATH}/${cluster.id}/pods}`),
        },
        {
          ...clusterDefaultProps(cluster, 'Metadata'),
          perform: () =>
            nav(`${CD_ABS_PATH}/${CLUSTERS_REL_PATH}/${cluster.id}/metadata}`),
        },
      ]

      return ret
    }) || []
  ).flat()
}

function ItemInner({ action, ancestors }) {
  return (
    <>
      <Flex
        gap="8px"
        fontSize={14}
        alignItems="center"
      >
        {action.icon && action.icon}
        <Flex flexDirection="column">
          <Flex flexDirection="row">
            <Flex fill="horizontal">
              {ancestors.length > 0 &&
                ancestors.map((ancestor) => (
                  <Fragment key={ancestor.id}>
                    <Span
                      opacity={0.5}
                      marginRight={8}
                    >
                      {ancestor.name}
                    </Span>
                    <Span marginRight={8}>&rsaquo;</Span>
                  </Fragment>
                ))}
              <span>{action.name}</span>
            </Flex>
            {action.suffix}
          </Flex>
          {action.subtitle && (
            <span style={{ fontSize: 12 }}>{action.subtitle}</span>
          )}
        </Flex>
      </Flex>
      {action.shortcut?.length ? (
        <div
          aria-hidden
          style={{ display: 'grid', gridAutoFlow: 'column', gap: '4px' }}
        >
          {action.shortcut.map((sc) => (
            <kbd
              key={sc}
              style={{
                padding: '4px 6px',
                background: 'rgba(0 0 0 / .1)',
                borderRadius: '4px',
                fontSize: 14,
              }}
            >
              {sc}
            </kbd>
          ))}
        </div>
      ) : null}
    </>
  )
}

const AppName = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  marginLeft: 8,
}))

const AppVersion = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  display: 'flex',
  flexGrow: 1,
  marginLeft: 8,
}))

const AppIcon = styled.img({
  height: 26,
  width: 26,
})

const ItemContentSC = styled.div((_) => ({
  display: 'flex',
  alignItems: 'center',
}))

const ItemContentTextSC = styled.div((_) => ({
  display: 'flex',
  alignItems: 'baseline',
}))

const ItemSC = styled.div((_) => ({
  display: 'flex',
  width: '100%',
  justifyContent: 'space-between',
}))

function AppItem({ app }) {
  return (
    <ItemSC>
      <ItemContentSC>
        {hasIcons(app) && <AppIcon src={getIcon(app)} />}
        <ItemContentTextSC>
          <AppName>{app.name}</AppName>
          {app.spec?.descriptor?.version && (
            <AppVersion>
              {toNiceVersion(app.spec.descriptor.version)}
            </AppVersion>
          )}
        </ItemContentTextSC>
      </ItemContentSC>
      <AppStatus app={app} />
    </ItemSC>
  )
}

function InstallAddonItem({ addon }: { addon: ClusterAddOnFragment }) {
  return (
    <ItemSC>
      <ItemContentSC>
        {addon.icon && <AppIcon src={addon.icon} />}
        <ItemContentTextSC>
          <AppName>{addon.name}</AppName>
          {addon.version && (
            <AppVersion>{toNiceVersion(addon.version)}</AppVersion>
          )}
        </ItemContentTextSC>
      </ItemContentSC>
      <Chip
        clickable
        size="small"
      >
        Install
      </Chip>
    </ItemSC>
  )
}

const ResultItem = forwardRef(
  ({ action, active, currentRootActionId }, ref: Ref<any>) => {
    const ancestors = useMemo(() => {
      if (!currentRootActionId) return action.ancestors
      const index = action.ancestors.findIndex(
        (ancestor) => ancestor.id === currentRootActionId
      )

      // +1 removes the currentRootAction; e.g.
      // if we are on the "Set theme" parent action,
      // the UI should not display "Set theme… > Dark"
      // but rather just "Dark"
      return action.ancestors.slice(index + 1)
    }, [action.ancestors, currentRootActionId])

    return (
      <Flex
        ref={ref}
        alignItems="center"
        padding="xsmall"
        background={active ? 'fill-one-hover' : 'transparent'}
        borderLeftColor={active ? 'border-primary' : 'transparent'}
        borderLeftWidth="3px"
        borderLeftStyle="solid"
        justifyContent="space-between"
        cursor="pointer"
      >
        {action.app ? (
          <AppItem app={action.app} />
        ) : action.addon ? (
          <InstallAddonItem addon={action.addon} />
        ) : (
          <ItemInner
            action={action}
            ancestors={ancestors}
          />
        )}
      </Flex>
    )
  }
)

function RenderResults() {
  const { results, rootActionId } = useMatches()

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) =>
        typeof item === 'string' ? (
          <div className="group-name">{item}</div>
        ) : (
          <ResultItem
            action={item}
            active={active}
            currentRootActionId={rootActionId}
          />
        )
      }
    />
  )
}

function useActions() {
  const { applications } = useContext(InstallationContext) as any
  const { data: clustersData } = useClustersTinyQuery({
    pollInterval: 120_000,
    fetchPolicy: 'cache-and-network',
  })
  const clusterEdges = clustersData?.clusters?.edges

  const navigate = useNavigate()
  const actions = useMemo(
    () => [
      ...buildClusterActions(clusterEdges, navigate),
      ...buildAppActions(applications, navigate),
    ],
    [applications, navigate, clusterEdges]
  )

  return actions
}

const PaletteFooterSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-two'],
  padding: theme.spacing.medium,
  display: 'flex',
  gap: theme.spacing.medium,
  borderTop: theme.borders['fill-two'],
  '& > *': {
    flexBasis: '50%',
  },
}))

const CommandPaletteStyles = createGlobalStyle(({ theme }) => ({
  '.cmdbar': {
    maxWidth: '600px',
    width: '100%',
    overflow: 'hidden',
    zIndex: 10000,
    background: theme.colors['fill-one'],
    border: theme.borders['fill-one'],
    boxShadow: theme.boxShadows.modal,
    borderRadius: theme.borderRadiuses.medium,
    ...theme.partials.text.body1,
    '.group-name': {
      padding: `${theme.spacing.small}px`,
      opacity: 0.5,
      ...theme.partials.text.overline,
    },
    '.search': {
      ...theme.partials.text.body2,
      padding: `${theme.spacing.medium}px ${theme.spacing.small}px`,
      fontSize: '16px',
      width: '100%',
      background: theme.colors['fill-two'],
      color: theme.colors['text-xlight'],
      border: 'none',
      borderBottom: theme.borders.input,
      outlineOffset: '-1px',
    },
    '.search:focus-visible': {
      color: theme.colors.text,
      ...theme.partials.focus.outline,
    },
  },
}))

function Palette() {
  const actions = useActions()

  useRegisterActions(actions, [actions])
  const theme = useTheme()
  const {
    isOpen: kbarIsOpen,
    query: { toggle: toggleKbar },
  } = useKBar((state) => ({
    isOpen:
      state.visualState === 'animating-in' || state.visualState === 'showing',
  }))
  const closeKBar = useCallback(() => {
    if (kbarIsOpen) {
      toggleKbar()
    }
  }, [kbarIsOpen, toggleKbar])

  const { modKeyString, altKeyString, keyCombinerString, isMac } = usePlatform()

  let aiChatCmd = `${modKeyString}${keyCombinerString}${altKeyString}${keyCombinerString}A`
  let searchDocsCmd = `${modKeyString}${keyCombinerString}${altKeyString}${keyCombinerString}D`

  if (isMac) {
    aiChatCmd = `${altKeyString}${keyCombinerString}${modKeyString}${keyCombinerString}A`
    searchDocsCmd = `${altKeyString}${keyCombinerString}${modKeyString}${keyCombinerString}D`
  }

  aiChatCmd = 'A'
  searchDocsCmd = 'D'

  const footerContent = (
    <>
      <LauncherButton
        icon={<ChatIcon color={theme.colors['icon-primary']} />}
        cmd={aiChatCmd}
        onClick={() => {
          closeKBar()
          launchAiChat()
        }}
        tabIndex={0}
      >
        Ask Plural AI
      </LauncherButton>
      <LauncherButton
        icon={<DocumentIcon color={theme.colors['icon-success']} />}
        cmd={searchDocsCmd}
        onClick={() => {
          closeKBar()
          launchDocSearch()
        }}
      >
        Search docs
      </LauncherButton>
    </>
  )

  return (
    <>
      <CommandPaletteStyles />
      {/* @ts-expect-error */}
      <KBarPortal style={{ zIndex: 10000 }}>
        <KBarPositioner style={{ zIndex: 10000 }}>
          <KBarAnimator className="cmdbar">
            <KBarSearch className="search" />
            <RenderResults />
            <PaletteFooterSC>{footerContent}</PaletteFooterSC>
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
    </>
  )
}

const launchDocSearch = () => {
  launchHelp(HelpMenuState.docSearch)
}
const launchAiChat = () => {
  launchHelp(HelpMenuState.chatBot)
}
const launchIntercom = () => {
  launchHelp(HelpMenuState.intercom)
}

export function CommandPalette({ children }) {
  const navigate = useNavigate()

  const baseActions = useMemo(
    () => [
      createAction({
        name: 'Nodes',
        shortcut: ['N'],
        icon: <ServersIcon />,
        section: PaletteSection.Cluster,
        perform: () => navigate('/nodes'),
      }),
      createAction({
        name: 'Pods',
        shortcut: ['P'],
        icon: <ApiIcon />,
        section: PaletteSection.Cluster,
        perform: () => navigate('/pods'),
      }),

      // CD
      createAction({
        name: 'Clusters',
        icon: <ClusterIcon />,
        shortcut: ['C'],
        section: PaletteSection.Cd,
        perform: () => navigate(`${CD_ABS_PATH}/${CLUSTERS_REL_PATH}`),
      }),
      createAction({
        name: 'Services',
        icon: <GitPullIcon />,
        shortcut: [],
        section: PaletteSection.Cd,
        perform: () => navigate(`${CD_ABS_PATH}/${SERVICES_REL_PATH}`),
      }),
      createAction({
        name: 'Repositories',
        shortcut: [],
        icon: <GitHubLogoIcon />,
        section: PaletteSection.Cd,
        perform: () => navigate(`${CD_ABS_PATH}/${REPOS_REL_PATH}`),
      }),
      createAction({
        name: 'Pipelines',
        shortcut: [],
        icon: <PipelineIcon />,
        section: PaletteSection.Cd,
        perform: () => navigate(`${CD_ABS_PATH}/${PIPELINES_REL_PATH}`),
      }),
      createAction({
        name: 'Providers',
        icon: <CloudIcon />,
        shortcut: [],
        section: PaletteSection.Cd,
        perform: () => navigate(`${CD_ABS_PATH}/${PROVIDERS_REL_PATH}`),
      }),
      createAction({
        name: 'Add-ons',
        icon: <MarketPlusIcon />,
        shortcut: [],
        section: PaletteSection.Cd,
        perform: () => navigate(`${CD_ABS_PATH}/${ADDONS_REL_PATH}`),
      }),
      // End CD

      createAction({
        name: 'Ask Plural AI',
        shortcut: ['A'],
        icon: <ChatIcon />,
        section: PaletteSection.Help,
        perform: launchAiChat,
      }),
      createAction({
        name: 'Search docs',
        shortcut: ['D'],
        icon: <DocumentIcon />,
        section: PaletteSection.Help,
        perform: launchDocSearch,
      }),
      createAction({
        name: 'Contact support',
        shortcut: ['S'],
        icon: <LifePreserverIcon />,
        section: PaletteSection.Help,
        perform: launchIntercom,
      }),
      createAction({
        name: 'Temporary Token',
        shortcut: ['T'],
        section: PaletteSection.Security,
        perform: () => navigate('/profile/security'),
      }),
      createAction({
        name: 'VPN',
        shortcut: ['V'],
        section: PaletteSection.Security,
        perform: () => navigate('/profile/vpn'),
      }),
      createAction({
        name: 'Users',
        shortcut: [],
        section: PaletteSection.Account,
        perform: () => navigate('/account/users'),
      }),
    ],
    [navigate]
  )

  return (
    <KBarProvider actions={baseActions}>
      <Palette />
      {children}
    </KBarProvider>
  )
}

export const LauncherButtonSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.buttonSmall,
  height: theme.spacing.xlarge,
  padding: `${0}px ${theme.spacing.medium}px`,
  background: theme.colors['fill-three'],
  border: theme.borders.input,
  borderRadius: theme.borderRadiuses.medium,
  color: theme.colors['text-light'],

  display: 'flex',
  alignItems: 'center',
  // justifyContent: "space-between",

  gap: theme.spacing.xsmall,
  '.content': {
    flexGrow: 1,
    textAlign: 'center',
  },
  '.chip': {
    backgroundColor: theme.colors['fill-three-selected'],
    borderColor: theme.colors.grey[600],
  },
  '&:hover': {
    background: theme.colors['fill-three-hover'],
  },
  '&:focus, &:focus-visible': {
    outline: 'none',
  },
  '&:focus-visible': {
    border: theme.borders['outline-focused'],
  },
}))

export default function LauncherButton({
  icon,
  cmd,
  children,
  ...props
}: Merge<
  ComponentProps<typeof LauncherButtonSC>,
  { icon: ReactElement; cmd: ReactNode; children: ReactNode }
>) {
  const iconClone = cloneElement(icon, {
    size: 16,
  })

  return (
    <LauncherButtonSC {...props}>
      {iconClone}
      <div className="content">{children}</div>
      <Chip
        className="chip"
        type="neutral"
        fillLevel={3}
        size="small"
        userSelect="none"
        whiteSpace="nowrap"
      >
        {cmd}
      </Chip>
    </LauncherButtonSC>
  )
}
