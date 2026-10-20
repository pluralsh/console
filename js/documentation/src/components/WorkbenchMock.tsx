import type { ComponentType } from 'react'

import {
  ErrorIcon,
  GitHubLogoIcon,
  GrafanaLogoIcon,
  LinearLogoIcon,
  PluralLogoIcon,
  PrOpenIcon,
  PrometheusLogoIcon,
  SlackLogoIcon,
  SuccessIcon,
} from '@pluralsh/design-system'

import styled, { type DefaultTheme, ThemeProvider } from 'styled-components'

// Decorative mock of the workbench screen for the docs landing hero. The
// content is an illustrative scenario, not real data — edit freely.

type IconType = ComponentType<{
  size?: number
  color?: string
  fullColor?: boolean
}>
type SideItemData = { name: string; icon?: IconType }
type Status = 'running' | 'success' | 'failed'

type Job = {
  prompt: string
  skill?: string
  pr?: string
  cost: string
  tokens: string
  user: string
  time: string
}

const tools: SideItemData[] = [
  { name: 'Prometheus', icon: PrometheusLogoIcon },
  { name: 'GitHub', icon: GitHubLogoIcon },
  { name: 'Slack', icon: SlackLogoIcon },
  { name: 'Linear', icon: LinearLogoIcon },
]

const webhooks: SideItemData[] = [
  { name: 'Grafana alerts', icon: GrafanaLogoIcon },
  { name: 'Failed build', icon: GitHubLogoIcon },
  { name: 'Deploy notifications' },
]

const cron = {
  schedule: '*/5 * * * *',
  prompt: 'Check cluster health and open a PR for any services that drifted.',
}

const tabs = ['Launch', 'Jobs', 'Monitoring', 'Issues', 'Alerts']

const jobGroups: {
  label: string
  status: Status
  count: number
  jobs: Job[]
}[] = [
  {
    label: 'Running',
    status: 'running',
    count: 2,
    jobs: [
      {
        prompt:
          'Investigate the spike in 500s on checkout-api after the latest deploy',
        cost: '$0.42',
        tokens: '512K',
        user: 'AN',
        time: 'now',
      },
      {
        skill: 'Upgrade',
        prompt: 'Bump ingress-nginx to 1.12 across all dev clusters',
        cost: '$0.27',
        tokens: '301K',
        user: 'MM',
        time: '2m',
      },
    ],
  },
  {
    label: 'Successful',
    status: 'success',
    count: 128,
    jobs: [
      {
        prompt:
          'Grafana alert: p95 latency over 2s on payments-svc. Find the root cause and fix it',
        pr: '#4821',
        cost: '$1.18',
        tokens: '1.4M',
        user: 'JL',
        time: '1h',
      },
      {
        skill: 'Cost report',
        prompt: 'Weekly EKS spend by cluster, flag anything idle for 7+ days',
        cost: '$2.31',
        tokens: '2.8M',
        user: 'PC',
        time: '3h',
      },
      {
        prompt:
          'Rotate the TLS certificates expiring this month in prod-us-east',
        pr: '3 PRs',
        cost: '$0.87',
        tokens: '960K',
        user: 'AN',
        time: '5h',
      },
    ],
  },
  {
    label: 'Failed',
    status: 'failed',
    count: 1,
    jobs: [
      {
        prompt: 'Roll back the cache config change on staging-eu',
        cost: '$0.19',
        tokens: '140K',
        user: 'MM',
        time: '1d',
      },
    ],
  },
]

// Brand logos pick their full-color variant from theme.mode; the mock is
// always dark.
const forceDark = (theme?: DefaultTheme): DefaultTheme => {
  if (!theme) throw new Error('WorkbenchMock requires a theme')

  return { ...theme, mode: 'dark' }
}

export function WorkbenchMock() {
  return (
    <ThemeProvider theme={forceDark}>
      <MockApp />
    </ThemeProvider>
  )
}

function MockApp() {
  return (
    <App aria-hidden="true">
      <TopBar>
        <PluralLogoIcon
          size={22}
          color={c.ink}
        />
      </TopBar>
      <Body>
        <Sidebar>
          <SideSection
            title="Tools"
            items={tools}
          />
          <SideSection
            title="Webhooks"
            items={webhooks}
          />
          <SideGroup>
            <SideTitle>
              Cron<span>+</span>
            </SideTitle>
            <CronSchedule>{cron.schedule}</CronSchedule>
            <CronPrompt>{cron.prompt}</CronPrompt>
          </SideGroup>
        </Sidebar>

        <Main>
          <TabsRow>
            <Tabs>
              {tabs.map((t, i) => (
                <Tab
                  key={t}
                  $active={i === 0}
                >
                  {t}
                  {t === 'Jobs' && <TabDot />}
                </Tab>
              ))}
            </Tabs>
            <GhostButton>Edit workbench</GhostButton>
          </TabsRow>

          <Prompt>
            <PromptText>
              Send a job to your workbench. Use / for skills and @ to mention
              clusters, services, stacks or repositories.
            </PromptText>
            <PromptBar>
              <Chip>+</Chip>
              <Chip>claude-opus ▾</Chip>
              <Chip>Coding ×</Chip>
              <Chip>Kubernetes ×</Chip>
              <SendButton>↑</SendButton>
            </PromptBar>
          </Prompt>

          <JobsHeader>
            <span className="title">Recent jobs</span>
            <span className="sub">Last 7 days</span>
            <GhostButton className="all">All jobs</GhostButton>
          </JobsHeader>

          {jobGroups.map((group) => (
            <div key={group.label}>
              <GroupHeader $status={group.status}>
                <span className="caret">▾</span>
                <StatusIcon status={group.status} />
                <span className="label">{group.label}</span>
                <span className="count">{group.count}</span>
              </GroupHeader>
              {group.jobs.map((job) => (
                <JobRow
                  key={job.prompt}
                  job={job}
                  status={group.status}
                />
              ))}
            </div>
          ))}
        </Main>
      </Body>
    </App>
  )
}

function SideSection({
  title,
  items,
}: {
  title: string
  items: SideItemData[]
}) {
  return (
    <SideGroup>
      <SideTitle>
        {title}
        <span>+</span>
      </SideTitle>
      {items.map(({ name, icon: Icon }) => (
        <SideItem key={name}>
          {Icon && (
            <Icon
              size={11}
              fullColor
            />
          )}
          {name}
        </SideItem>
      ))}
    </SideGroup>
  )
}

function JobRow({ job, status }: { job: Job; status: Status }) {
  return (
    <Row>
      <StatusIcon status={status} />
      <RowText>
        {job.skill && <SkillChip>{job.skill}</SkillChip>}
        <span className="prompt">{job.prompt}</span>
      </RowText>
      <RowMeta>
        {job.pr && (
          <Badge>
            <PrOpenIcon size={9} />
            {job.pr}
          </Badge>
        )}
        <Badge>
          {job.cost}
          <span className="dim">{job.tokens}</span>
        </Badge>
        <Avatar>{job.user}</Avatar>
        <span className="time">{job.time}</span>
      </RowMeta>
    </Row>
  )
}

function StatusIcon({ status }: { status: Status }) {
  if (status === 'running') return <RunningIcon />
  if (status === 'failed')
    return (
      <ErrorIcon
        size={11}
        color={c.danger}
      />
    )

  return (
    <SuccessIcon
      size={11}
      color={c.success}
    />
  )
}

// The product is always dark, independent of the docs color mode.
const c = {
  app: '#16171b',
  panel: '#1b1c21',
  raised: '#202228',
  line: '#2b2d34',
  lineStrong: '#383b44',
  ink: '#eceef3',
  body: '#c3c7d0',
  muted: '#8a8f99',
  success: '#3fbf8a',
  danger: '#f2788d',
  accent: '#747bff',
}

const groupTint: Record<Status, string> = {
  running: 'rgb(116 123 255 / 0.08)',
  success: 'rgb(63 191 138 / 0.06)',
  failed: 'rgb(242 120 141 / 0.07)',
}

const WORKBENCH_MOCK_SIZE = { width: 1100, height: 600 }

const App = styled.div({
  width: WORKBENCH_MOCK_SIZE.width,
  height: WORKBENCH_MOCK_SIZE.height,
  display: 'flex',
  flexDirection: 'column',
  background: c.app,
  color: c.body,
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  fontSize: 12,
  lineHeight: 1.4,
  overflow: 'hidden',
  userSelect: 'none',
})

const TopBar = styled.div({
  height: 48,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  padding: '0 16px',
  background: '#0f1013',
  borderBottom: `1px solid ${c.line}`,
})

const Body = styled.div({
  flex: 1,
  display: 'flex',
  minHeight: 0,
})

const Sidebar = styled.div({
  width: 220,
  flexShrink: 0,
  padding: '16px 0',
  background: c.panel,
  borderRight: `1px solid ${c.line}`,
})

const SideGroup = styled.div({
  padding: '0 18px 16px',
  marginBottom: 16,
  borderBottom: `1px solid ${c.line}`,
  '&:last-child': { borderBottom: 'none' },
})

const SideTitle = styled.div({
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 8,
  fontSize: 11,
  color: c.muted,
})

const SideItem = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  height: 22,
  fontSize: 11.5,
  color: c.body,
})

const CronSchedule = styled.div({
  marginBottom: 4,
  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
  fontSize: 11.5,
  color: c.ink,
})

const CronPrompt = styled.div({
  fontSize: 11,
  color: c.muted,
})

const Main = styled.div({
  flex: 1,
  minWidth: 0,
  padding: '12px 20px',
})

const TabsRow = styled.div({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 14,
})

const Tabs = styled.div({
  display: 'flex',
  gap: 4,
})

const Tab = styled.div<{ $active?: boolean }>(({ $active }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 10px',
  borderRadius: 4,
  fontSize: 11.5,
  color: $active ? c.ink : c.muted,
  background: $active ? c.raised : 'transparent',
  border: `1px solid ${$active ? c.lineStrong : 'transparent'}`,
}))

const TabDot = styled.span({
  width: 5,
  height: 5,
  borderRadius: '50%',
  background: c.accent,
})

const GhostButton = styled.div({
  padding: '5px 10px',
  borderRadius: 4,
  fontSize: 11,
  color: c.ink,
  border: `1px solid ${c.lineStrong}`,
  '&.all': { marginLeft: 'auto' },
})

const Prompt = styled.div({
  padding: '12px 12px 10px',
  marginBottom: 18,
  borderRadius: 6,
  background: c.panel,
  border: `1px solid ${c.lineStrong}`,
})

const PromptText = styled.div({
  minHeight: 34,
  fontSize: 11.5,
  color: c.muted,
})

const PromptBar = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
})

const Chip = styled.div({
  display: 'flex',
  alignItems: 'center',
  height: 22,
  padding: '0 8px',
  borderRadius: 4,
  fontSize: 10.5,
  color: c.body,
  background: c.raised,
  border: `1px solid ${c.lineStrong}`,
})

const SendButton = styled.div({
  marginLeft: 'auto',
  width: 24,
  height: 24,
  display: 'grid',
  placeItems: 'center',
  borderRadius: '50%',
  fontSize: 12,
  color: '#fff',
  background: '#4a51f2',
})

const JobsHeader = styled.div({
  display: 'flex',
  alignItems: 'baseline',
  gap: 8,
  marginBottom: 10,
  '.title': { fontSize: 14, fontWeight: 600, color: c.ink },
  '.sub': { fontSize: 10.5, color: c.muted },
})

const GroupHeader = styled.div<{ $status: Status }>(({ $status }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  height: 28,
  padding: '0 10px',
  background: groupTint[$status],
  borderTop: `1px solid ${c.line}`,
  '.caret': { fontSize: 9, color: c.muted },
  '.label': { fontSize: 11.5, fontWeight: 600, color: c.ink },
  '.count': { fontSize: 11, color: c.muted },
}))

const Row = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  height: 34,
  padding: '0 10px',
  borderTop: `1px solid ${c.line}`,
})

const RowText = styled.div({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  '.prompt': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 11.5,
    color: c.body,
  },
})

const SkillChip = styled.span({
  flexShrink: 0,
  padding: '2px 6px',
  borderRadius: 3,
  fontSize: 10,
  color: c.ink,
  background: c.raised,
  border: `1px solid ${c.lineStrong}`,
})

const RowMeta = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexShrink: 0,
  '.time': { width: 30, textAlign: 'right', fontSize: 10.5, color: c.muted },
})

const Badge = styled.span({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  height: 20,
  padding: '0 6px',
  borderRadius: 3,
  fontSize: 10,
  color: c.ink,
  background: c.raised,
  border: `1px solid ${c.lineStrong}`,
  '.dim': { color: c.muted },
})

const Avatar = styled.span({
  width: 18,
  height: 18,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 3,
  fontSize: 8,
  fontWeight: 600,
  color: c.ink,
  background: '#3a3d48',
})

const RunningIcon = styled.span({
  width: 11,
  height: 11,
  flexShrink: 0,
  borderRadius: '50%',
  border: '1.5px solid rgb(116 123 255 / 0.3)',
  borderTopColor: c.accent,
  borderRightColor: c.accent,
  transform: 'rotate(-20deg)',
})
