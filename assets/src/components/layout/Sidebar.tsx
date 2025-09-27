import {
  AiSparkleOutlineIcon,
  ArrowTopRightIcon,
  Avatar,
  CatalogIcon,
  CostManagementIcon,
  EdgeComputeIcon,
  Flex,
  FlowIcon,
  GearTrainIcon,
  GitHubLogoIcon,
  GitPullIcon,
  HamburgerMenuCollapsedIcon,
  HamburgerMenuCollapseIcon,
  HomeIcon,
  KubernetesAltIcon,
  LogoutIcon,
  Menu,
  MenuItem,
  PersonIcon,
  ScrollIcon,
  StackIcon,
  Tooltip,
  WarningShieldIcon,
  WrapWithIf,
} from '@pluralsh/design-system'

import {
  createContext,
  Dispatch,
  ReactElement,
  ReactNode,
  SetStateAction,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link, useLocation } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import { useDefaultCDPath } from 'components/cd/ContinuousDeployment'
import { useCDEnabled } from 'components/cd/utils/useCDEnabled'
import { PersonaConfigurationFragment } from 'generated/graphql'

import { SECURITY_ABS_PATH } from 'routes/securityRoutesConsts'

import { SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'
import { AI_ABS_PATH } from '../../routes/aiRoutesConsts.tsx'

import { KUBERNETES_ROOT_PATH } from '../../routes/kubernetesRoutesConsts.tsx'
import { getStacksAbsPath } from '../../routes/stacksRoutesConsts.tsx'
import { useLogin } from '../contexts.tsx'

import HelpLauncher from '../help/HelpLauncher.tsx'

import {
  FeatureFlagContext,
  FeatureFlags,
} from 'components/flows/FeatureFlagContext.tsx'
import { useOutsideClick } from 'components/hooks/useOutsideClick.tsx'
import usePersistedState from 'components/hooks/usePersistedState.tsx'
import { SidebarItem } from 'components/utils/sidebar/SidebarItem.tsx'
import { SidebarSection } from 'components/utils/sidebar/SidebarSection.tsx'
import { TRUNCATE } from 'components/utils/truncate.ts'
import { FLOWS_ABS_PATH } from 'routes/flowRoutesConsts.tsx'
import { SELF_SERVICE_ABS_PATH } from 'routes/selfServiceRoutesConsts.tsx'
import { GITHUB_LINK } from 'utils/constants.ts'
import { EDGE_ABS_PATH } from '../../routes/edgeRoutes.tsx'
import CommandPaletteShortcuts from '../commandpalette/CommandPaletteShortcuts.tsx'

const SIDEBAR_WIDTH = 64
const SIDEBAR_EXPANDED_WIDTH = 180

type MenuItem = {
  text: string
  icon: ReactElement<any>
  path: string
  pathRegexp?: RegExp
  ignoreRegexp?: RegExp
  hotkeys?: string[]
  enabled?: boolean
  expandedLabel: string
}

type SidebarContextT = {
  isExpanded: boolean
  setIsExpanded: Dispatch<SetStateAction<boolean>>
}
export const SidebarContext = createContext<SidebarContextT>({
  isExpanded: false,
  setIsExpanded: () => {},
})
export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = usePersistedState<boolean>(
    'sidebar-expanded',
    false
  )
  const ctx = useMemo(
    () => ({ isExpanded, setIsExpanded }),
    [isExpanded, setIsExpanded]
  )
  return <SidebarContext value={ctx}>{children}</SidebarContext>
}

// Keep hotkeys in sync with assets/src/components/commandpalette/commands.ts.
function getMenuItems({
  isCDEnabled,
  featureFlags,
  cdPath,
  personaConfig,
}: {
  isSandbox: boolean
  isCDEnabled: boolean
  featureFlags: FeatureFlags
  cdPath: string
  personaConfig: Nullable<PersonaConfigurationFragment>
}): MenuItem[] {
  return [
    {
      text: 'Home',
      expandedLabel: 'Home',
      icon: <HomeIcon />,
      path: '/',
      hotkeys: ['shift H'],
    },
    {
      text: 'Continuous deployment',
      expandedLabel: 'CD',
      icon: <GitPullIcon />,
      path: cdPath,
      pathRegexp: /^(\/cd)|(\/cd\/.*)$/,
      ignoreRegexp: /^\/cd\/settings.*$/,
      hotkeys: ['shift C'],
    },
    {
      text: 'Stacks',
      expandedLabel: 'Stacks',
      icon: <StackIcon />,
      path: getStacksAbsPath(''),
      hotkeys: ['shift S'],
    },
    {
      text: 'Flows',
      expandedLabel: 'Flows',
      icon: <FlowIcon />,
      path: FLOWS_ABS_PATH,
      hotkeys: ['shift F'],
    },
    {
      text: 'Self service',
      expandedLabel: 'Self service',
      icon: <CatalogIcon />,
      path: SELF_SERVICE_ABS_PATH,
      hotkeys: ['shift P'],
    },
    {
      text: 'Kubernetes',
      expandedLabel: 'Kubernetes',
      icon: <KubernetesAltIcon />,
      path: `/${KUBERNETES_ROOT_PATH}`,
      enabled: !!(personaConfig?.all || personaConfig?.sidebar?.kubernetes),
      hotkeys: ['shift K'],
    },
    {
      text: 'Plural AI',
      expandedLabel: 'Plural AI',
      icon: <AiSparkleOutlineIcon />,
      path: AI_ABS_PATH,
      hotkeys: ['shift A'],
    },
    ...(featureFlags.Edge
      ? [
          {
            text: 'Edge',
            expandedLabel: 'Edge',
            icon: <EdgeComputeIcon />,
            path: EDGE_ABS_PATH,
            hotkeys: ['shift E'],
          },
        ]
      : []),
    {
      text: 'Security',
      expandedLabel: 'Security',
      icon: <WarningShieldIcon />,
      path: SECURITY_ABS_PATH,
      enabled: !!(personaConfig?.all || personaConfig?.sidebar?.kubernetes),
    },
    {
      text: 'Cost Management',
      expandedLabel: 'Cost Management',
      icon: <CostManagementIcon />,
      path: '/cost-management',
      hotkeys: ['shift C+M'],
    },
    {
      text: 'Settings',
      expandedLabel: 'Settings',
      icon: <GearTrainIcon />,
      path: SETTINGS_ABS_PATH,
      enabled:
        isCDEnabled &&
        !!(personaConfig?.all || personaConfig?.sidebar?.settings),
    },
  ].filter((item) => item.enabled !== false)
}

type MenuItemPath = Pick<MenuItem, 'path' | 'pathRegexp' | 'ignoreRegexp'>
function isActiveMenuItem(
  { path, pathRegexp, ignoreRegexp }: MenuItemPath,
  currentPath: string
) {
  return (
    (path === '/' ? currentPath === path : currentPath.startsWith(path)) ||
    (!!pathRegexp &&
      (currentPath.match(pathRegexp)?.length ?? 0) > 0 &&
      (!ignoreRegexp || (currentPath.match(ignoreRegexp)?.length ?? 0) === 0))
  )
}

export function Sidebar() {
  const menuItemRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { isExpanded, setIsExpanded } = use(SidebarContext)
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const { me, configuration, personaConfiguration } = useLogin()
  const { featureFlags } = use(FeatureFlagContext)
  const { pathname } = useLocation()
  const isActive = useCallback(
    (menuItem: MenuItemPath) => isActiveMenuItem(menuItem, pathname),
    [pathname]
  )
  const isCDEnabled = useCDEnabled({ redirect: false })
  const defaultCDPath = useDefaultCDPath()

  const menuItems = useMemo(
    () =>
      getMenuItems({
        isSandbox: !!configuration?.isSandbox,
        isCDEnabled,
        featureFlags,
        cdPath: defaultCDPath,
        personaConfig: personaConfiguration,
      }),
    [
      configuration?.isSandbox,
      isCDEnabled,
      featureFlags,
      defaultCDPath,
      personaConfiguration,
    ]
  )

  const { logout } = useLogin()
  const handleLogout = useCallback(() => {
    setIsMenuOpen(false)
    logout?.()
  }, [logout])

  useOutsideClick(menuRef, (event) => {
    if (!menuItemRef.current?.contains(event.target as any)) {
      setIsMenuOpen(false)
    }
  })

  const theme = useTheme()

  if (!me) return null

  return (
    <SidebarSC $isExpanded={isExpanded}>
      <SidebarSection flex={1}>
        {menuItems.map((item, i) => (
          <SidebarItem
            key={i}
            asLink
            to={item.path}
            active={isActive(item)}
            expandedLabel={item.expandedLabel}
            tooltip={
              <Flex
                gap="small"
                align="center"
              >
                {item.expandedLabel}
                <CommandPaletteShortcuts shortcuts={item.hotkeys} />
              </Flex>
            }
          >
            {item.icon}
          </SidebarItem>
        ))}
        <Flex flex={1} />
        <SidebarItem
          tooltip="Expand"
          expandedLabel="Collapse"
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded((x: boolean) => !x)
          }}
        >
          {isExpanded ? (
            <HamburgerMenuCollapseIcon />
          ) : (
            <HamburgerMenuCollapsedIcon />
          )}
        </SidebarItem>
        <HelpLauncher />
        <SidebarItem
          ref={menuItemRef}
          active={isMenuOpen}
          onClick={(e) => {
            e.stopPropagation()
            setIsMenuOpen((x) => !x)
          }}
          expandedLabel="Menu"
          css={{ paddingLeft: theme.spacing.xxsmall }}
        >
          <Avatar
            name={me.name}
            src={me.profile}
            size={32}
          />
        </SidebarItem>
        {configuration?.consoleVersion && (
          <ConsoleVersion version={configuration.consoleVersion} />
        )}
      </SidebarSection>
      {isMenuOpen && (
        <ProfileMenuSC ref={menuRef}>
          <MenuItem
            as={Link}
            to="/profile"
            onClick={() => setIsMenuOpen(false)}
          >
            <PersonIcon marginRight="xsmall" />
            My profile
          </MenuItem>
          <MenuItem
            as="a"
            href="https://docs.plural.sh"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsMenuOpen(false)}
          >
            <ScrollIcon marginRight="xsmall" />
            <span css={{ flex: 1 }}>Docs</span>
            <ArrowTopRightIcon />
          </MenuItem>
          <MenuItem
            as="a"
            href={`${GITHUB_LINK}/plural`}
            target="_blank"
            rel="noopener noreferrer"
            expandedLabel="GitHub"
          >
            <GitHubLogoIcon marginRight="xsmall" />
            <span css={{ flex: 1 }}>GitHub</span>
            <ArrowTopRightIcon />
          </MenuItem>
          <MenuItem
            as="a"
            style={{ color: theme.colors['icon-danger'] }}
            onClick={handleLogout}
          >
            <LogoutIcon marginRight="xsmall" />
            Logout
          </MenuItem>
        </ProfileMenuSC>
      )}
    </SidebarSC>
  )
}

function ConsoleVersion({ version }: { version: string }) {
  const { isExpanded } = use(SidebarContext)
  return (
    <WrapWithIf
      condition={!isExpanded}
      wrapper={<Tooltip label={`Console version: v${version}`} />}
    >
      <ConsoleVersionSC $isExpanded={isExpanded}>
        {isExpanded ? 'Console version: v' : 'v'}
        {version}
      </ConsoleVersionSC>
    </WrapWithIf>
  )
}
const ConsoleVersionSC = styled.span<{ $isExpanded?: boolean }>(
  ({ theme, $isExpanded }) => ({
    ...TRUNCATE,
    width: '100%',
    textAlign: $isExpanded ? 'left' : 'center',
    padding: theme.spacing.xxsmall,
    fontFamily: theme.fontFamilies.sans,
    fontSize: 10,
    letterSpacing: '-0.35px',
  })
)

const ProfileMenuSC = styled(Menu)(({ theme }) => ({
  zIndex: 999,
  position: 'absolute',
  bottom: theme.spacing.medium,
  minWidth: '175px',
  left: 'calc(100% + 10px)',
  '& a': { color: theme.colors.text, textDecoration: 'none' },
  '& *:hover': { background: theme.colors['fill-two-hover'] },
}))

const SidebarSC = styled.div<{
  $isExpanded: boolean
}>(({ theme, $isExpanded }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  justifyContent: 'flex-start',
  height: '100%',
  transition: 'max-width 0.2s ease-in-out',
  width: '100%',
  maxWidth: $isExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_WIDTH,
  backgroundColor: theme.colors['fill-accent'],
  borderRight: theme.borders.default,
}))
