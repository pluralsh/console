import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarResults,
  KBarSearch,
  createAction,
  useMatches,
  useRegisterActions,
} from 'kbar'
import { Fragment, forwardRef, useContext, useMemo } from 'react'

import {
  ApiIcon,
  ComponentsIcon,
  DashboardIcon,
  DocumentIcon,
  GearTrainIcon,
  LogsIcon,
  RunBookIcon,
  ServersIcon,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'
import { Flex, Span } from 'honorable'
import styled, { createGlobalStyle } from 'styled-components'

import { getIcon, hasIcons } from './apps/misc'
import { InstallationContext } from './Installations'
import AppStatus from './apps/AppStatus'

function buildActions(applications, nav) {
  return applications
    .map((app) => [
      {
        id: app.name,
        name: app.name,
        app,
        icon: hasIcons(app) ? (
          <AppIcon
            url={getIcon(app)}
            size="xxsmall"
          />
        ) : null,
        shortcut: [],
        section: 'Apps',
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

function AppItem({ app }) {
  return (
    <>
      {hasIcons(app) && <AppIcon src={getIcon(app)} />}
      <AppName>{app.name}</AppName>
      {app.spec?.descriptor?.version && (
        <AppVersion>v{app.spec.descriptor.version}</AppVersion>
      )}
      <AppStatus app={app} />
    </>
  )
}

const ResultItem = forwardRef(
  ({ action, active, currentRootActionId }, ref) => {
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

function useAppActions() {
  const { applications } = useContext(InstallationContext)
  const navigate = useNavigate()
  const actions = useMemo(
    () => buildActions(applications, navigate),
    [applications, navigate]
  )

  useRegisterActions(actions)
}

function Palette() {
  useAppActions()
  const Provider = createGlobalStyle(({ theme }) => ({
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
        textTransform: 'uppercase',
        opacity: 0.5,
        ...theme.partials.text.overline,
      },
      '.search': {
        ...theme.partials.text.body2,
        padding: `${theme.spacing.medium}px ${theme.spacing.small}px`,
        fontSize: '16px',
        width: '100%',
        background: theme.colors['fill-one'],
        color: theme.colors['text-xlight'],
        border: 'none',
        borderBottom: theme.borders['fill-two'],
        outlineOffset: '-1px',
      },
      '.search:focus-visible': {
        color: theme.colors.text,
        ...theme.partials.focus.outline,
      },
    },
  }))

  return (
    <>
      <Provider />
      <KBarPortal style={{ zIndex: 10000 }}>
        <KBarPositioner style={{ zIndex: 10000 }}>
          <KBarAnimator className="cmdbar">
            <KBarSearch className="search" />
            <RenderResults />
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
    </>
  )
}

export function CommandPalette({ children }) {
  const navigate = useNavigate()
  const baseActions = useMemo(
    () => [
      createAction({
        name: 'Nodes',
        shortcuts: ['N'],
        icon: <ServersIcon />,
        section: 'Cluster',
        perform: () => navigate('/nodes'),
      }),
      createAction({
        name: 'Pods',
        shortcuts: ['P'],
        icon: <ApiIcon />,
        section: 'Cluster',
        perform: () => navigate('/pods'),
      }),
      createAction({
        name: 'Temporary Token',
        shortcuts: ['N'],
        section: 'Security',
        perform: () => navigate('/profile/security'),
      }),
      createAction({
        name: 'VPN',
        shortcuts: ['V'],
        section: 'Security',
        perform: () => navigate('/profile/vpn'),
      }),
      createAction({
        name: 'Users',
        shortcuts: [],
        section: 'Account',
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
