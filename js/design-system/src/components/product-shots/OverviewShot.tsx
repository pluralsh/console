import type { ComponentType, ReactNode } from 'react'
import styled, {
  type DefaultTheme,
  ThemeProvider,
  useTheme,
} from 'styled-components'

import {
  AddIcon,
  AiSparkleOutlineIcon,
  ArrowUpIcon,
  CaretDownIcon,
  CatalogIcon,
  CostManagementIcon,
  ErrorIcon,
  FlowIcon,
  GearTrainIcon,
  GitPullIcon,
  HomeIcon,
  InfoOutlineIcon,
  KubernetesAltIcon,
  PeopleIcon,
  PluralLogoIcon,
  PrOpenIcon,
  SearchIcon,
  StackIcon,
  SuccessIcon,
  WarningShieldIcon,
  WorkbenchIcon,
} from '../../icons'
import { styledThemeDark, styledThemeLight } from '../../theme'
import { Logo, shotTokens } from './blocks'
import { Contours } from './Contours'
import {
  type OverviewFlowContent,
  type OverviewJobStatus,
  type OverviewNav,
  type OverviewScreen,
  type OverviewScreenId,
  type OverviewStatus,
  type OverviewWorkbenchContent,
  overviewScreens,
} from './overviewScreens'
import type { ProductShotTheme } from './scenarios'

export const OVERVIEW_SCREEN_WIDTH = 1280
export const OVERVIEW_SCREEN_HEIGHT = 800
export const OVERVIEW_STAGE_WIDTH = 1200
export const OVERVIEW_STAGE_HEIGHT = 750

export type OverviewShotProps = {
  screen: OverviewScreenId
  theme?: ProductShotTheme
  // Without the background only the app screen renders, at its native size.
  background?: boolean
  width?: number
  className?: string
}

type NavIcon = ComponentType<{ size?: number }>

const navItems: [OverviewNav, NavIcon][] = [
  ['home', HomeIcon],
  ['cd', GitPullIcon],
  ['stacks', StackIcon],
  ['flows', FlowIcon],
  ['workbenches', WorkbenchIcon],
  ['catalog', CatalogIcon],
  ['kubernetes', KubernetesAltIcon],
  ['ai', AiSparkleOutlineIcon],
  ['security', WarningShieldIcon],
  ['cost', CostManagementIcon],
]

const tk = (theme: DefaultTheme) => shotTokens(theme)

const statusColor = (theme: DefaultTheme, status: OverviewStatus) =>
  ({
    healthy: theme.colors['icon-success'],
    progressing: theme.colors['icon-warning'],
    failed: theme.colors['icon-danger'],
  })[status]

export function OverviewShot({
  screen: screenId,
  theme = 'dark',
  background = true,
  width,
  className,
}: OverviewShotProps) {
  const screen: OverviewScreen = overviewScreens[screenId]
  const styledTheme = theme === 'dark' ? styledThemeDark : styledThemeLight
  const nativeWidth = background ? OVERVIEW_STAGE_WIDTH : OVERVIEW_SCREEN_WIDTH
  const nativeHeight = background
    ? OVERVIEW_STAGE_HEIGHT
    : OVERVIEW_SCREEN_HEIGHT
  const scale = (width ?? nativeWidth) / nativeWidth
  const app = (
    <AppScreen
      $framed={background}
      data-overview-screen={screen.id}
      data-theme={theme}
    >
      <TopBar>
        <span className="logo">
          <PluralLogoIcon size={22} />
        </span>
        <Breadcrumbs>
          {screen.breadcrumbs.map((crumb, index) => (
            <span
              className={
                index === screen.breadcrumbs.length - 1 ? 'current' : undefined
              }
              key={crumb}
            >
              {index > 0 && <span className="divider">/</span>}
              {crumb}
            </span>
          ))}
        </Breadcrumbs>
        <SearchBox>
          <SearchIcon size={12} />
          <span>Search</span>
          <kbd>⌘K</kbd>
        </SearchBox>
        <Avatar $size={26}>KS</Avatar>
      </TopBar>
      <AppBody>
        <NavRail>
          {navItems.map(([id, Icon]) => (
            <NavItem
              $active={id === screen.nav}
              key={id}
            >
              <Icon size={16} />
            </NavItem>
          ))}
          <NavItem className="settings">
            <GearTrainIcon size={16} />
          </NavItem>
        </NavRail>
        {screen.content.type === 'flow' ? (
          <FlowBody content={screen.content} />
        ) : (
          <WorkbenchBody content={screen.content} />
        )}
      </AppBody>
    </AppScreen>
  )

  return (
    <ThemeProvider theme={styledTheme}>
      <Frame
        className={className}
        style={{ height: nativeHeight * scale, width: nativeWidth * scale }}
      >
        <Scaled
          data-overview-shot={`${screen.id}:${theme}`}
          data-theme={theme}
          style={{
            height: nativeHeight,
            transform: scale === 1 ? undefined : `scale(${scale})`,
            width: nativeWidth,
          }}
        >
          {background ? (
            <Stage>
              <Contours
                color={tk(styledTheme).contour}
                height={OVERVIEW_STAGE_HEIGHT}
                width={OVERVIEW_STAGE_WIDTH}
              />
              {app}
            </Stage>
          ) : (
            app
          )}
        </Scaled>
      </Frame>
    </ThemeProvider>
  )
}

function Toolbar({
  icon,
  name,
  tabs,
  actions,
}: {
  icon: ReactNode
  name: string
  tabs: readonly string[]
  actions: ReactNode
}) {
  return (
    <ToolbarRow>
      <span className="heading">
        <span className="appIcon">{icon}</span>
        <span className="name">{name}</span>
        <InfoOutlineIcon size={13} />
      </span>
      <Tabs>
        {tabs.map((tab, index) => (
          <Tab
            $active={index === 0}
            key={tab}
          >
            {tab}
          </Tab>
        ))}
      </Tabs>
      <span className="actions">{actions}</span>
    </ToolbarRow>
  )
}

function FlowBody({ content }: { content: OverviewFlowContent }) {
  return (
    <Main>
      <Toolbar
        actions={
          <>
            <Button>
              <PeopleIcon size={12} />
              Permissions
            </Button>
            <Button $primary>
              <AiSparkleOutlineIcon size={12} />
              Start workbench job
            </Button>
          </>
        }
        icon={<FlowIcon size={14} />}
        name={content.name}
        tabs={content.tabs}
      />
      <Split>
        <SidePanel>
          <SideHeading>
            Workbenches
            <AddIcon size={12} />
          </SideHeading>
          {content.workbenches.map((workbench) => (
            <WorkbenchItem key={workbench.name}>
              <span className="name">
                <WorkbenchIcon size={14} />
                {workbench.name}
              </span>
              <span className="description">{workbench.description}</span>
              <span className="tools">
                {workbench.tools.map((tool) => (
                  <span
                    className="tool"
                    key={tool}
                  >
                    <Logo
                      logo={tool}
                      size={11}
                    />
                  </span>
                ))}
              </span>
            </WorkbenchItem>
          ))}
        </SidePanel>
        <Content>
          <Summary>
            {content.summary.map((item) => (
              <SummaryCard key={item.label}>
                <span className="label">
                  {item.status && <StatusDot $status={item.status} />}
                  {item.label}
                </span>
                <span className="value">{item.value}</span>
              </SummaryCard>
            ))}
          </Summary>
          <Table>
            <TableRow className="head">
              <span>Service</span>
              <span>Cluster</span>
              <span>Repository</span>
              <span>Last activity</span>
              <span>Status</span>
              <span>Errors</span>
            </TableRow>
            {content.services.map((service) => (
              <TableRow key={service.name}>
                <span className="service">
                  <span className="serviceIcon">
                    <GitPullIcon size={11} />
                  </span>
                  {service.name}
                </span>
                <span>{service.cluster}</span>
                <span className="muted">{service.repository}</span>
                <span className="muted">{service.activity}</span>
                <span>
                  <StatusChip $status={service.status}>
                    <StatusDot $status={service.status} />
                    {service.status}
                  </StatusChip>
                </span>
                <span className={service.errors ? 'errors' : 'muted'}>
                  {service.errors ?? '—'}
                </span>
              </TableRow>
            ))}
          </Table>
        </Content>
      </Split>
    </Main>
  )
}

function WorkbenchBody({ content }: { content: OverviewWorkbenchContent }) {
  return (
    <Main>
      <Toolbar
        actions={<Button>Edit workbench</Button>}
        icon={<WorkbenchIcon size={14} />}
        name={content.name}
        tabs={content.tabs}
      />
      <Split>
        <SidePanel>
          {(
            [
              ['Tools', content.tools],
              ['Webhooks', content.webhooks],
            ] as const
          ).map(([title, items]) => (
            <SideGroup key={title}>
              <SideHeading>
                {title}
                <AddIcon size={12} />
              </SideHeading>
              {items.map((item) => (
                <SideItem key={item.name}>
                  {'logo' in item && item.logo ? (
                    <Logo
                      logo={item.logo}
                      size={12}
                    />
                  ) : (
                    <span className="blank" />
                  )}
                  {item.name}
                </SideItem>
              ))}
            </SideGroup>
          ))}
          <SideGroup>
            <SideHeading>
              Cron
              <AddIcon size={12} />
            </SideHeading>
            <span className="cron">{content.cron.schedule}</span>
            <span className="description">{content.cron.prompt}</span>
          </SideGroup>
        </SidePanel>
        <Content>
          <PromptBox>
            <span className="placeholder">{content.prompt}</span>
            <span className="bar">
              <Chip>+</Chip>
              {content.promptChips.map((chip, index) => (
                <Chip key={chip}>
                  {chip}
                  {index === 0 ? <CaretDownIcon size={8} /> : ' ×'}
                </Chip>
              ))}
              <SendButton>
                <ArrowUpIcon size={12} />
              </SendButton>
            </span>
          </PromptBox>
          <JobsHeading>
            <span className="title">Recent jobs</span>
            <span className="sub">Last 7 days</span>
            <Button className="all">All jobs</Button>
          </JobsHeading>
          <Table>
            {content.jobGroups.map((group) => (
              <div key={group.label}>
                <GroupRow $status={group.status}>
                  <CaretDownIcon size={9} />
                  <JobStatusIcon status={group.status} />
                  <span className="label">{group.label}</span>
                  <span className="count">{group.count}</span>
                </GroupRow>
                {group.jobs.map((job) => (
                  <JobRow key={job.prompt}>
                    <JobStatusIcon status={group.status} />
                    <span className="text">
                      {job.skill && <Chip>{job.skill}</Chip>}
                      <span className="prompt">{job.prompt}</span>
                    </span>
                    <span className="meta">
                      {job.pr && (
                        <Chip>
                          <PrOpenIcon size={10} />
                          {job.pr}
                        </Chip>
                      )}
                      <Chip>
                        {job.cost}
                        <span className="dim">{job.tokens}</span>
                      </Chip>
                      <Avatar $size={20}>{job.user}</Avatar>
                      <span className="time">{job.time}</span>
                    </span>
                  </JobRow>
                ))}
              </div>
            ))}
          </Table>
        </Content>
      </Split>
    </Main>
  )
}

function JobStatusIcon({ status }: { status: OverviewJobStatus }) {
  if (status === 'running') return <Spinner />
  if (status === 'failed')
    return (
      <span className="statusIcon failed">
        <ErrorIcon size={12} />
      </span>
    )

  return (
    <span className="statusIcon success">
      <SuccessIcon size={12} />
    </span>
  )
}

const Frame = styled.div({ overflow: 'hidden', position: 'relative' })

const Scaled = styled.div({
  left: 0,
  position: 'absolute',
  top: 0,
  transformOrigin: 'top left',
})

const Stage = styled.div(({ theme }) => ({
  background: tk(theme).stage,
  borderRadius: 20,
  height: OVERVIEW_STAGE_HEIGHT,
  overflow: 'hidden',
  position: 'relative',
  width: OVERVIEW_STAGE_WIDTH,
}))

const AppScreen = styled.div<{ $framed: boolean }>(({ theme, $framed }) => ({
  background: tk(theme).window,
  border: `1px solid ${tk(theme).windowBorder}`,
  borderRadius: $framed ? '14px 0 0 0' : 12,
  boxShadow: $framed
    ? theme.mode === 'dark'
      ? '0 30px 80px rgb(0 0 0 / 0.45)'
      : '0 30px 80px rgb(28 36 72 / 0.14)'
    : 'none',
  boxSizing: 'border-box',
  color: tk(theme).text,
  display: 'flex',
  flexDirection: 'column',
  fontFamily: theme.fontFamilies.sans,
  fontSize: 12,
  height: OVERVIEW_SCREEN_HEIGHT,
  left: $framed ? 99 : undefined,
  lineHeight: 1.4,
  overflow: 'hidden',
  position: $framed ? 'absolute' : 'relative',
  top: $framed ? 80 : undefined,
  width: OVERVIEW_SCREEN_WIDTH,
  '*': { boxSizing: 'border-box' },
  '.muted': { color: tk(theme).muted },
  '.statusIcon': { display: 'flex', flexShrink: 0 },
  '.statusIcon.success': { color: theme.colors['icon-success'] },
  '.statusIcon.failed': { color: theme.colors['icon-danger'] },
}))

const TopBar = styled.div(({ theme }) => ({
  alignItems: 'center',
  borderBottom: `1px solid ${tk(theme).windowBorder}`,
  display: 'flex',
  flexShrink: 0,
  gap: 12,
  height: 52,
  paddingRight: 18,
  '.logo': {
    color: tk(theme).rail,
    display: 'flex',
    justifyContent: 'center',
    width: 64,
  },
}))

const Breadcrumbs = styled.div(({ theme }) => ({
  color: tk(theme).muted,
  display: 'flex',
  flex: 1,
  fontSize: 12,
  '.divider': { color: tk(theme).faint, padding: '0 8px' },
  '.current': { color: tk(theme).text },
}))

const SearchBox = styled.div(({ theme }) => ({
  alignItems: 'center',
  background: tk(theme).well,
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 4,
  color: tk(theme).faint,
  display: 'flex',
  gap: 8,
  height: 30,
  padding: '0 10px',
  width: 240,
  kbd: {
    border: `1px solid ${tk(theme).border}`,
    borderRadius: 3,
    fontFamily: 'inherit',
    fontSize: 10,
    marginLeft: 'auto',
    padding: '1px 5px',
  },
}))

const Avatar = styled.span<{ $size: number }>(({ theme, $size }) => ({
  alignItems: 'center',
  background: theme.mode === 'dark' ? '#3A3D48' : '#E4E6EE',
  borderRadius: '50%',
  color: tk(theme).text,
  display: 'flex',
  flexShrink: 0,
  fontSize: $size * 0.36,
  fontWeight: 600,
  height: $size,
  justifyContent: 'center',
  width: $size,
}))

const AppBody = styled.div({ display: 'flex', flex: 1, minHeight: 0 })

const NavRail = styled.div(({ theme }) => ({
  alignItems: 'center',
  borderRight: `1px solid ${tk(theme).windowBorder}`,
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  gap: 6,
  paddingTop: 14,
  width: 64,
  '.settings': { marginTop: 'auto', marginBottom: 14 },
}))

const NavItem = styled.span<{ $active?: boolean }>(({ theme, $active }) => ({
  alignItems: 'center',
  background: $active ? tk(theme).outer : 'transparent',
  border: `1px solid ${$active ? tk(theme).border : 'transparent'}`,
  borderRadius: 6,
  color: $active ? tk(theme).text : tk(theme).rail,
  display: 'flex',
  height: 36,
  justifyContent: 'center',
  width: 36,
}))

const Main = styled.div({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minWidth: 0,
})

const ToolbarRow = styled.div(({ theme }) => ({
  alignItems: 'center',
  borderBottom: `1px solid ${tk(theme).windowBorder}`,
  display: 'flex',
  flexShrink: 0,
  gap: 24,
  height: 56,
  padding: '0 20px',
  '.heading': {
    alignItems: 'center',
    color: tk(theme).faint,
    display: 'flex',
    gap: 8,
  },
  '.appIcon': {
    alignItems: 'center',
    background: tk(theme).outer,
    border: `1px solid ${tk(theme).border}`,
    borderRadius: 4,
    color: tk(theme).text,
    display: 'flex',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  '.name': { color: tk(theme).text, fontSize: 14, fontWeight: 600 },
  '.actions': { display: 'flex', gap: 8, marginLeft: 'auto' },
}))

const Tabs = styled.div({ display: 'flex', gap: 2 })

const Tab = styled.span<{ $active?: boolean }>(({ theme, $active }) => ({
  background: $active ? tk(theme).outer : 'transparent',
  border: `1px solid ${$active ? tk(theme).border : 'transparent'}`,
  borderRadius: 4,
  color: $active ? tk(theme).text : tk(theme).muted,
  padding: '6px 11px',
}))

const Button = styled.span<{ $primary?: boolean }>(({ theme, $primary }) => ({
  alignItems: 'center',
  background: $primary ? theme.colors['action-primary'] : 'transparent',
  border: `1px solid ${$primary ? 'transparent' : tk(theme).border}`,
  borderRadius: 4,
  color: $primary ? '#FFFFFF' : tk(theme).text,
  display: 'flex',
  fontSize: 12,
  fontWeight: 500,
  gap: 6,
  height: 30,
  padding: '0 12px',
  whiteSpace: 'nowrap',
}))

const Split = styled.div({ display: 'flex', flex: 1, minHeight: 0 })

const SidePanel = styled.div(({ theme }) => ({
  borderRight: `1px solid ${tk(theme).windowBorder}`,
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  gap: 20,
  padding: '18px 18px',
  width: 250,
  '.cron': {
    color: tk(theme).text,
    fontFamily: theme.fontFamilies.mono,
    fontSize: 12,
  },
  '.description': { color: tk(theme).faint, fontSize: 11, lineHeight: 1.45 },
}))

const SideHeading = styled.div(({ theme }) => ({
  alignItems: 'center',
  color: tk(theme).text,
  display: 'flex',
  fontSize: 13,
  fontWeight: 600,
  justifyContent: 'space-between',
  marginBottom: 2,
  svg: { color: tk(theme).faint },
}))

const SideGroup = styled.div(({ theme }) => ({
  borderBottom: `1px solid ${tk(theme).windowBorder}`,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  paddingBottom: 18,
  '&:last-child': { borderBottom: 0 },
}))

const SideItem = styled.div(({ theme }) => ({
  alignItems: 'center',
  color: tk(theme).muted,
  display: 'flex',
  gap: 9,
  height: 20,
  '.blank': { width: 12 },
}))

const WorkbenchItem = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  '.name': {
    alignItems: 'center',
    color: theme.colors['text-primary-accent'],
    display: 'flex',
    gap: 8,
    svg: { color: tk(theme).rail },
  },
  '.tools': { display: 'flex', gap: 4 },
  '.tool': {
    alignItems: 'center',
    border: `1px solid ${tk(theme).border}`,
    borderRadius: 3,
    display: 'flex',
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
}))

const Content = styled.div({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: 16,
  minWidth: 0,
  padding: 20,
})

const Summary = styled.div({
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'repeat(4, 1fr)',
})

const SummaryCard = styled.div(({ theme }) => ({
  background: tk(theme).inner,
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 6,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '12px 14px',
  '.label': {
    alignItems: 'center',
    color: tk(theme).muted,
    display: 'flex',
    gap: 6,
  },
  '.value': { color: tk(theme).text, fontSize: 20, fontWeight: 600 },
}))

const StatusDot = styled.span<{ $status: OverviewStatus }>(
  ({ theme, $status }) => ({
    background: statusColor(theme, $status),
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
    height: 6,
    width: 6,
  })
)

const StatusChip = styled.span<{ $status: OverviewStatus }>(
  ({ theme, $status }) => ({
    alignItems: 'center',
    border: `1px solid ${tk(theme).border}`,
    borderRadius: 3,
    color: $status === 'healthy' ? tk(theme).muted : tk(theme).text,
    display: 'inline-flex',
    fontSize: 11,
    gap: 6,
    padding: '2px 7px',
    textTransform: 'capitalize',
  })
)

const Table = styled.div(({ theme }) => ({
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 6,
  overflow: 'hidden',
}))

const TableRow = styled.div(({ theme }) => ({
  alignItems: 'center',
  borderTop: `1px solid ${tk(theme).border}`,
  display: 'grid',
  gap: 12,
  gridTemplateColumns: '1.4fr 1fr 1.2fr 0.8fr 0.9fr 0.5fr',
  height: 42,
  padding: '0 14px',
  whiteSpace: 'nowrap',
  '&.head': {
    background: tk(theme).innerHeader,
    borderTop: 0,
    color: tk(theme).muted,
    fontSize: 11,
    height: 34,
  },
  '.service': { alignItems: 'center', display: 'flex', gap: 8 },
  '.serviceIcon': {
    alignItems: 'center',
    border: `1px solid ${tk(theme).border}`,
    borderRadius: 3,
    color: tk(theme).rail,
    display: 'flex',
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  '.errors': { color: theme.colors['icon-danger'] },
}))

const PromptBox = styled.div(({ theme }) => ({
  background: tk(theme).inner,
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 6,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: '14px 14px 12px',
  '.placeholder': { color: tk(theme).faint, minHeight: 34 },
  '.bar': { alignItems: 'center', display: 'flex', gap: 6 },
}))

const Chip = styled.span(({ theme }) => ({
  alignItems: 'center',
  background: tk(theme).outer,
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 4,
  color: tk(theme).text,
  display: 'inline-flex',
  flexShrink: 0,
  fontSize: 11,
  gap: 5,
  height: 22,
  padding: '0 8px',
  '.dim': { color: tk(theme).faint },
}))

const SendButton = styled.span(({ theme }) => ({
  alignItems: 'center',
  background: theme.colors['action-primary'],
  borderRadius: '50%',
  color: '#FFFFFF',
  display: 'flex',
  height: 26,
  justifyContent: 'center',
  marginLeft: 'auto',
  width: 26,
}))

const JobsHeading = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: 10,
  '.title': { color: tk(theme).text, fontSize: 15, fontWeight: 600 },
  '.sub': { color: tk(theme).faint, fontSize: 11 },
  '.all': { marginLeft: 'auto' },
}))

const groupTint: Record<OverviewJobStatus, [string, string]> = {
  running: ['rgb(116 123 255 / 0.09)', 'rgb(93 99 244 / 0.06)'],
  success: ['rgb(63 191 138 / 0.07)', 'rgb(23 163 106 / 0.06)'],
  failed: ['rgb(242 120 141 / 0.08)', 'rgb(224 64 96 / 0.06)'],
}

const GroupRow = styled.div<{ $status: OverviewJobStatus }>(
  ({ theme, $status }) => ({
    alignItems: 'center',
    background: groupTint[$status][theme.mode === 'dark' ? 0 : 1],
    borderTop: `1px solid ${tk(theme).border}`,
    color: tk(theme).faint,
    display: 'flex',
    gap: 8,
    height: 32,
    padding: '0 12px',
    '&:first-child': { borderTop: 0 },
    '.label': { color: tk(theme).text, fontWeight: 600 },
    '.count': { color: tk(theme).faint },
  })
)

const JobRow = styled.div(({ theme }) => ({
  alignItems: 'center',
  borderTop: `1px solid ${tk(theme).border}`,
  display: 'flex',
  gap: 10,
  height: 40,
  padding: '0 12px',
  '.text': {
    alignItems: 'center',
    display: 'flex',
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  '.prompt': {
    color: tk(theme).muted,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '.meta': { alignItems: 'center', display: 'flex', flexShrink: 0, gap: 6 },
  '.time': {
    color: tk(theme).faint,
    fontSize: 11,
    textAlign: 'right',
    width: 30,
  },
}))

function Spinner() {
  const theme = useTheme()
  const color = theme.colors['action-primary']

  return (
    <svg
      height="12"
      style={{ flexShrink: 0 }}
      viewBox="0 0 12 12"
      width="12"
    >
      <circle
        cx="6"
        cy="6"
        fill="none"
        r="5"
        stroke={color}
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />
      <path
        d="M6 1 A5 5 0 0 1 11 6"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}
