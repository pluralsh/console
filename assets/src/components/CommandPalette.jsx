import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  useMatches,
  KBarResults,
  createAction,
  useRegisterActions,
} from 'kbar'
import { Fragment, forwardRef, useContext, useMemo } from 'react'
import { InstallationContext } from './Installations'
import { getIcon, hasIcons } from './apps/misc'
import {
  ApiIcon,
  AppIcon,
  BuildIcon,
  ComponentsIcon,
  DashboardIcon,
  DocumentIcon,
  GearTrainIcon,
  LogsIcon,
  RunBookIcon,
  ServersIcon,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'

const animatorStyle = {
  maxWidth: '600px',
  width: '100%',
  background: 'rgb(28 28 29)',
  color: 'rgba(252 252 252 / 0.9)',
  borderRadius: '8px',
  overflow: 'hidden',
  zIndex: 10000,
  boxShadow: 'rgb(0 0 0 / 50%) 0px 16px 70px',
}

const searchStyle = {
  padding: '12px 16px',
  fontSize: '16px',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
  border: 'none',
  background: 'rgb(28 28 29)',
  color: 'rgba(252 252 252 / 0.9)',
}

const groupNameStyle = {
  padding: '8px 16px',
  fontSize: '10px',
  textTransform: 'uppercase',
  opacity: 0.5,
}

function buildActions(applications, nav) {
  console.log(applications)
  return applications
    .map((app) => [
      {
        id: app.name,
        name: app.name,
        icon: hasIcons(app) ? (
          <AppIcon
            url={getIcon(app)}
            size="xsmall"
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
      <div
        ref={ref}
        style={{
          padding: '12px 16px',
          background: active ? 'rgb(53 53 54)' : 'transparent',
          borderLeft: `2px solid ${
            active ? 'rgba(252 252 252 / 0.9)' : 'transparent'
          }`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            fontSize: 14,
          }}
        >
          {action.icon && action.icon}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div>
              {ancestors.length > 0 &&
                ancestors.map((ancestor) => (
                  <Fragment key={ancestor.id}>
                    <span
                      style={{
                        opacity: 0.5,
                        marginRight: 8,
                      }}
                    >
                      {ancestor.name}
                    </span>
                    <span
                      style={{
                        marginRight: 8,
                      }}
                    >
                      &rsaquo;
                    </span>
                  </Fragment>
                ))}
              <span>{action.name}</span>
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
          <div style={groupNameStyle}>{item}</div>
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
  return (
    <KBarPortal style={{ zIndex: 10000 }}>
      <KBarPositioner style={{ zIndex: 10000 }}>
        <KBarAnimator style={animatorStyle}>
          <KBarSearch style={searchStyle} />
          <RenderResults />
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
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
      //   createAction({
      //     name: 'Builds',
      //     shortcuts: ['B'],
      //     icon: <BuildIcon />,
      //     section: 'Cluster',
      //     perform: () => navigate('/builds'),
      //   }),
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
      //   createAction({
      //     name: 'Webhooks',
      //     shortcuts: [],
      //     section: 'Account',
      //     perform: () => navigate('/account/webhooks'),
      //   }),
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
