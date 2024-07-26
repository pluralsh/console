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
import { type Merge } from 'type-fest'

import {
  ApiIcon,
  Chip,
  CloudIcon,
  ClusterIcon,
  DocumentIcon,
  GitHubLogoIcon,
  GitPullIcon,
  LifePreserverIcon,
  PipelineIcon,
  ServersIcon,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'
import styled, { createGlobalStyle, useTheme } from 'styled-components'

import { ClusterTinyFragment, useClustersTinyQuery } from 'generated/graphql'
import {
  CD_ABS_PATH,
  CLUSTERS_REL_PATH,
  PIPELINES_REL_PATH,
  PROVIDERS_REL_PATH,
  REPOS_REL_PATH,
  SERVICES_REL_PATH,
} from 'routes/cdRoutesConsts'
import { Edges } from 'utils/graphql'

import { InstallationContext } from '../Installations'
import { HelpMenuState, launchHelp } from '../help/HelpLauncher'
import { usePlatform } from '../hooks/usePlatform'
import { useProjectId } from '../contexts/ProjectsContext'

export enum PaletteSection {
  Actions = 'Actions',
  Apps = 'Apps',
  Cluster = 'Cluster',
  Help = 'Help',
  Security = 'Security',
  Account = 'Account',
  Cd = 'Continuous Deployment (CD)',
  CdClusters = 'CD – Clusters',
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
  const theme = useTheme()

  return (
    <>
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.xsmall,
          fontSize: 14,
          alignItems: 'center',
        }}
      >
        {action.icon && action.icon}
        <div css={{ display: 'flex', flexDirection: 'column' }}>
          <div css={{ display: 'flex', flexDirection: 'row' }}>
            <div css={{ display: 'flex' }}>
              {ancestors.length > 0 &&
                ancestors.map((ancestor) => (
                  <Fragment key={ancestor.id}>
                    <span
                      css={{
                        opacity: 0.5,
                        marginRight: theme.spacing.xsmall,
                      }}
                    >
                      {ancestor.name}
                    </span>
                    <span css={{ marginRight: theme.spacing.xsmall }}>
                      &rsaquo;
                    </span>
                  </Fragment>
                ))}
              <span>{action.name}</span>
            </div>
            {action.suffix}
          </div>
          {action.subtitle && (
            <span style={{ fontSize: 12 }}>{action.subtitle}</span>
          )}
        </div>
      </div>
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

const ResultItem = forwardRef(
  (
    {
      action,
      active,
      currentRootActionId,
    }: {
      action: any
      active: boolean
      currentRootActionId: Nullable<string>
    },
    ref: Ref<any>
  ) => {
    const theme = useTheme()
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
      <div
        ref={ref}
        css={{
          display: 'flex',
          alignItems: 'center',
          padding: theme.spacing.xsmall,
          background: active ? theme.colors['fill-one-hover'] : 'transparent',
          borderLeftColor: active
            ? theme.colors['border-primary']
            : 'transparent',
          borderLeftWidth: 3,
          borderLeftStyle: 'solid',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <ItemInner
          action={action}
          ancestors={ancestors}
        />
      </div>
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
  const theme = useTheme()
  const projectId = useProjectId()
  const { applications } = useContext(InstallationContext) as any
  const { data: clustersData } = useClustersTinyQuery({
    pollInterval: 120_000,
    fetchPolicy: 'cache-and-network',
    variables: { projectId },
  })
  const clusterEdges = clustersData?.clusters?.edges

  const navigate = useNavigate()
  const actions = useMemo(
    () => buildClusterActions(clusterEdges, navigate),
    [clusterEdges, navigate, applications, theme]
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

  let searchDocsCmd = `${modKeyString}${keyCombinerString}${altKeyString}${keyCombinerString}D`

  if (isMac) {
    searchDocsCmd = `${altKeyString}${keyCombinerString}${modKeyString}${keyCombinerString}D`
  }

  searchDocsCmd = 'D'

  const footerContent = (
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
const launchIntercom = () => {
  launchHelp(HelpMenuState.intercom)
}

export function Old({ children }) {
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
      // End CD

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
    <KBarProvider
      actions={baseActions}
      options={{ disableScrollbarManagement: true }}
    >
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
  flex: 1,
  display: 'flex',
  alignItems: 'center',

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
