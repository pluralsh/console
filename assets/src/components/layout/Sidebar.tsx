import {
  AiSparkleOutlineIcon,
  ArrowTopRightIcon,
  Avatar,
  CatalogIcon,
  CostManagementIcon,
  Sidebar as DSSidebar,
  EdgeComputeIcon,
  Flex,
  FlowIcon,
  GearTrainIcon,
  GitHubLogoIcon,
  GitPullIcon,
  HomeIcon,
  KubernetesAltIcon,
  LogoutIcon,
  Menu,
  MenuItem,
  PersonIcon,
  PrOpenIcon,
  ScrollIcon,
  SidebarExpandButton,
  SidebarExpandWrapper,
  SidebarItem,
  SidebarSection,
  StackIcon,
  Tooltip,
  useSidebar,
  WarningShieldIcon,
  WrapWithIf,
} from '@pluralsh/design-system'

import {
  ReactElement,
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
import { PR_DEFAULT_ABS_PATH } from 'routes/prRoutesConsts'

import { SECURITY_ABS_PATH } from 'routes/securityRoutesConsts'

import { SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'
import { AI_ABS_PATH } from '../../routes/aiRoutesConsts.tsx'

import { KUBERNETES_ROOT_PATH } from '../../routes/kubernetesRoutesConsts'
import { getStacksAbsPath } from '../../routes/stacksRoutesConsts'
import { useLogin } from '../contexts'

import HelpLauncher from '../help/HelpLauncher'

import {
  FeatureFlagContext,
  FeatureFlags,
} from 'components/flows/FeatureFlagContext.tsx'
import { useOutsideClick } from 'components/hooks/useOutsideClick.tsx'
import { TRUNCATE } from 'components/utils/truncate.ts'
import { FLOWS_ABS_PATH } from 'routes/flowRoutesConsts.tsx'
import { CATALOGS_ABS_PATH } from '../../routes/catalogRoutesConsts.tsx'
import { EDGE_ABS_PATH } from '../../routes/edgeRoutes.tsx'
import CommandPaletteShortcuts from '../commandpalette/CommandPaletteShortcuts.tsx'
import { GITHUB_LINK } from 'utils/constants.ts'

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
      text: 'Service catalog',
      expandedLabel: 'Service catalog',
      icon: <CatalogIcon />,
      path: CATALOGS_ABS_PATH,
      hotkeys: ['shift S+C'],
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
      text: 'PRs',
      expandedLabel: 'Pull requests',
      icon: <PrOpenIcon />,
      path: PR_DEFAULT_ABS_PATH,
      pathRegexp: /^(\/pr)|(\/pr\/.*)$/,
      enabled:
        isCDEnabled &&
        !!(personaConfig?.all || personaConfig?.sidebar?.pullRequests),
      hotkeys: ['shift P'],
    },
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
    // {
    //   text: 'Backups',
    //   expandedLabel: 'Backups',
    //   icon: <HistoryIcon />,
    //   path: '/backups',
    //   enabled:
    //     isCDEnabled &&
    //     !!(personaConfig?.all || personaConfig?.sidebar?.backups),
    //   hotkeys: ['shift B', '9'],
    // },
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

function isActiveMenuItem(
  {
    path,
    pathRegexp,
    ignoreRegexp,
  }: Pick<MenuItem, 'path' | 'pathRegexp' | 'ignoreRegexp'>,
  currentPath
) {
  return (
    (path === '/' ? currentPath === path : currentPath.startsWith(path)) ||
    (pathRegexp &&
      (currentPath.match(pathRegexp)?.length ?? 0 > 0) &&
      (!ignoreRegexp || (currentPath.match(ignoreRegexp)?.length ?? 0) === 0))
  )
}

const SidebarSC = styled(DSSidebar).attrs(({ variant }) => ({
  variant,
}))((_) => ({
  flexGrow: 1,
  minHeight: 0,
  height: 'auto',
  overflow: 'visible',
}))

export default function Sidebar() {
  const menuItemRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const { me, configuration, personaConfiguration } = useLogin()
  const { featureFlags } = use(FeatureFlagContext)
  const { pathname } = useLocation()
  const isActive = useCallback(
    (menuItem: Parameters<typeof isActiveMenuItem>[0]) =>
      isActiveMenuItem(menuItem, pathname),
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
    <SidebarSC variant="console">
      <SidebarExpandWrapper pathname={pathname}>
        <SidebarSection flex={1}>
          {menuItems.map((item, i) => (
            <Tooltip
              key={i}
              label={
                <div
                  css={{
                    alignItems: 'center',
                    display: 'flex',
                    gap: theme.spacing.small,
                  }}
                >
                  {item.expandedLabel}
                  <CommandPaletteShortcuts shortcuts={item.hotkeys} />
                </div>
              }
            >
              <SidebarItem
                clickable
                className={`sidebar-${item.text}`}
                active={isActive(item)}
                as={Link}
                to={item.path}
                expandedLabel={item.expandedLabel}
              >
                {item.icon}
              </SidebarItem>
            </Tooltip>
          ))}
          <Flex flex={1} />
          <SidebarExpandButton />
          <HelpLauncher />
          <SidebarItem
            ref={menuItemRef}
            className="sidebar-menu"
            active={isMenuOpen}
            clickable
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
      </SidebarExpandWrapper>
    </SidebarSC>
  )
}

function ConsoleVersion({ version }: { version: string }) {
  const { isExpanded } = useSidebar()
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
  bottom: 8,
  minWidth: '175px',
  left: 'calc(100% + 10px)',
  '& a': { color: theme.colors.text, textDecoration: 'none' },
  '& *:hover': { background: theme.colors['fill-two-hover'] },
}))
