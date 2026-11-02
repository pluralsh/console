import type { ReactNode } from 'react'
import styled, { type DefaultTheme, ThemeProvider } from 'styled-components'

import AiSparkleOutlineIcon from '../icons/AiSparkleOutlineIcon'
import AwsLogoIcon from '../icons/AwsLogoIcon'
import CaretDownIcon from '../icons/CaretDownIcon'
import CloseIcon from '../icons/CloseIcon'
import ElasticsearchLogoIcon from '../icons/ElasticsearchLogoIcon'
import EyeIcon from '../icons/EyeIcon'
import GitPullIcon from '../icons/GitPullIcon'
import GrafanaLogoIcon from '../icons/GrafanaLogoIcon'
import PlayIcon from '../icons/PlayIcon'
import PluralLogoIcon from '../icons/PluralLogoIcon'
import PlusIcon from '../icons/PlusIcon'
import StackIcon from '../icons/StackIcon'
import type { ProductShotTheme } from './scenarios'

export const CLUSTER_AGENT_WIDTH = 1202
export const CLUSTER_AGENT_HEIGHT = 2308

export type ClusterAgentShotProps = {
  theme?: ProductShotTheme
  // Rendered width in px. The shot is laid out at 1202×2308 and scaled to fit.
  width?: number
  className?: string
}

const button = '#7440F2'

const palette = (mode: string) =>
  mode === 'light'
    ? {
        stage: '#F1F2F6',
        dots: 'rgb(28 36 72 / 0.16)',
        card: '#FFFFFF',
        border: 'rgb(28 36 72 / 0.1)',
        inner: '#F4F5F8',
        prompt: '#F7F8FB',
        text: '#1F232C',
        muted: '#5D6373',
        faint: '#8A90A0',
        shadow: '0 18px 44px rgb(28 36 72 / 0.12)',
        failed: '#C44766',
        success: '#1C8A72',
        ring: 'rgb(116 64 242 / 0.35)',
        ringSoft: 'rgb(116 64 242 / 0.16)',
      }
    : {
        stage: '#212329',
        dots: '#3C3E44',
        card: '#2C2F34',
        border: 'rgb(255 255 255 / 0.08)',
        inner: '#36383F',
        prompt: '#30333A',
        text: '#E7E9EE',
        muted: '#A7ACB6',
        faint: '#7E8490',
        shadow: '0 22px 50px rgb(0 0 0 / 0.4)',
        failed: '#E7A0AE',
        success: '#8FCFC2',
        ring: 'rgb(167 140 255 / 0.7)',
        ringSoft: 'rgb(116 64 242 / 0.28)',
      }

const tk = (theme: DefaultTheme) => palette(theme.mode)

const Frame = styled.div<{ $scale: number }>(({ $scale }) => ({
  height: CLUSTER_AGENT_HEIGHT * $scale,
  overflow: 'hidden',
  position: 'relative',
  width: CLUSTER_AGENT_WIDTH * $scale,
}))

const Stage = styled.div<{ $scale: number }>(({ theme, $scale }) => ({
  backgroundColor: tk(theme).stage,
  backgroundImage: `radial-gradient(circle, ${tk(theme).dots} 1.7px, transparent 1.9px)`,
  backgroundPosition: '14px 10px',
  backgroundSize: '38px 38px',
  color: tk(theme).text,
  fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
  height: CLUSTER_AGENT_HEIGHT,
  left: 0,
  overflow: 'hidden',
  position: 'absolute',
  top: 0,
  transform: `scale(${$scale})`,
  transformOrigin: 'top left',
  width: CLUSTER_AGENT_WIDTH,
  '*': { boxSizing: 'border-box' },
}))

const Card = styled.div<{ $z: number }>(({ theme, $z }) => ({
  background: tk(theme).card,
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 18,
  boxShadow: tk(theme).shadow,
  position: 'absolute',
  zIndex: $z,
}))

const segments = [
  { value: 2, color: '#D57C8A' },
  { value: 25, color: '#8EE6B1' },
  { value: 4, color: '#7AD7E4' },
  { value: 3, color: '#F0D878' },
  { value: 28, color: '#9570F0' },
]

const legend = [
  { color: '#8EE6B1', value: '25', label: 'Upgradable' },
  { color: '#D57C8A', value: '2', label: 'Not upgradable' },
  { color: '#7AD7E4', value: '4', label: 'Latest' },
  { color: '#9570F0', value: '28', label: 'Compliant' },
]

const stacks: {
  name: string
  status: 'Failed' | 'Successful'
  mark: ReactNode
}[] = [
  { name: 'airbyte', status: 'Failed', mark: <AirbyteMark /> },
  { name: 'dagster', status: 'Successful', mark: <DagsterMark /> },
  {
    name: 'grafana',
    status: 'Successful',
    mark: (
      <GrafanaLogoIcon
        fullColor
        size={18}
      />
    ),
  },
]

function shotTheme(mode: ProductShotTheme): DefaultTheme {
  return {
    mode,
    colors: {},
    spacing: {},
    fontFamilies: {
      sans: '"Inter", "Helvetica", "Arial", sans-serif',
      mono: '"JetBrains Mono", ui-monospace, monospace',
      semi: '"Inter", "Helvetica", "Arial", sans-serif',
      sansHero: '"Inter", "Helvetica", "Arial", sans-serif',
    },
  } as DefaultTheme
}

export function ClusterAgentShot({
  theme = 'dark',
  width = 480,
  className,
}: ClusterAgentShotProps) {
  const scale = width / CLUSTER_AGENT_WIDTH

  return (
    <ThemeProvider theme={shotTheme(theme)}>
      <Frame
        $scale={scale}
        className={className}
      >
        <Stage
          $scale={scale}
          data-cluster-agent-shot=""
          data-theme={theme}
        >
          <ClusterCard />
          <PullRequestCard />
          <ChatCard />
          <AgentCard />
        </Stage>
      </Frame>
    </ThemeProvider>
  )
}

function AgentCard() {
  return (
    <Card
      $z={4}
      style={{ height: 78, left: 604, top: 804, width: 372 }}
    >
      <Row
        style={{
          alignItems: 'center',
          gap: 10,
          height: '100%',
          justifyContent: 'center',
        }}
      >
        <AiSparkleOutlineIcon size={16} />
        <Label $size={18}>Starting background agent</Label>
      </Row>
    </Card>
  )
}

function ChatCard() {
  return (
    <Card
      $z={3}
      style={{ height: 304, left: 198, padding: 22, top: 868, width: 592 }}
    >
      <Row style={{ alignItems: 'center', gap: 14 }}>
        <Presence />
        <Prompt>Double the size of the elasticsearch cluster</Prompt>
      </Row>
      <Row
        style={{
          alignItems: 'center',
          gap: 14,
          justifyContent: 'flex-end',
          marginTop: 18,
        }}
      >
        <PrepareButton>Preparing PR...</PrepareButton>
        <AgentMark />
      </Row>
      <Composer>
        <Placeholder>How can I help?</Placeholder>
        <Row style={{ alignItems: 'center', marginTop: 18 }}>
          <IconButton>
            <PlusIcon size={16} />
          </IconButton>
          <IconButton>
            <AiSparkleOutlineIcon size={16} />
          </IconButton>
          <Spacer />
          <ModelButton>
            <AwsLogoIcon
              fullColor
              size={18}
            />
            <CaretDownIcon size={10} />
          </ModelButton>
          <CopilotButton>
            Copilot Agent
            <PlayIcon size={12} />
          </CopilotButton>
        </Row>
      </Composer>
    </Card>
  )
}

function ClusterCard() {
  return (
    <Card
      $z={1}
      style={{
        height: 332,
        left: 186,
        padding: '18px 18px 16px',
        top: 1310,
        width: 408,
      }}
    >
      <Row style={{ alignItems: 'center', gap: 8 }}>
        <CloseIcon size={12} />
        <Label $size={15}>Cluster overview</Label>
      </Row>
      <Row style={{ alignItems: 'center', gap: 8, marginTop: 8 }}>
        <Donut />
        <Legend />
      </Row>
    </Card>
  )
}

function PullRequestCard() {
  return (
    <Card
      $z={2}
      style={{
        height: 456,
        left: 548,
        padding: '18px 16px 16px',
        top: 1184,
        width: 392,
      }}
    >
      <Row style={{ alignItems: 'center', gap: 8, padding: '0 4px' }}>
        <GitPullIcon size={14} />
        <Label $size={14}>Pull request</Label>
      </Row>
      <PrRow>
        <Row style={{ alignItems: 'center', gap: 10, minWidth: 0 }}>
          <LogoTile>
            <ElasticsearchLogoIcon
              fullColor
              size={18}
            />
          </LogoTile>
          <Label $size={15}>elasticsearch</Label>
        </Row>
        <Row style={{ alignItems: 'center', gap: 8 }}>
          <OpenedChip>Opened</OpenedChip>
          <ViewButton>
            <EyeIcon size={13} />
            View
          </ViewButton>
        </Row>
      </PrRow>
      <Stacks>
        <Insights>AI Insights</Insights>
        <Row style={{ alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <StackIcon size={13} />
          <Label $size={13}>Stacks</Label>
        </Row>
        {stacks.map((stack) => (
          <StackRow key={stack.name}>
            <Row style={{ alignItems: 'center', gap: 10, minWidth: 0 }}>
              <LogoTile>{stack.mark}</LogoTile>
              <div style={{ minWidth: 0 }}>
                <Label $size={15}>{stack.name}</Label>
                <Repo>git@github.com:acme/acme-aws.git</Repo>
              </div>
            </Row>
            <Status $kind={stack.status}>
              {stack.status === 'Failed' && <AiSparkleOutlineIcon size={11} />}
              {stack.status}
            </Status>
          </StackRow>
        ))}
      </Stacks>
    </Card>
  )
}

function Donut() {
  const radius = 58
  const circumference = 2 * Math.PI * radius
  const gap = 5
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  let cursor = 0

  return (
    <DonutWrap>
      <svg
        aria-hidden="true"
        height="168"
        viewBox="0 0 168 168"
        width="168"
      >
        <g transform="rotate(-90 84 84)">
          {segments.map((segment) => {
            const length = (segment.value / total) * circumference - gap
            const dashOffset = -cursor
            cursor += (segment.value / total) * circumference

            return (
              <circle
                cx="84"
                cy="84"
                fill="none"
                key={segment.color}
                r={radius}
                stroke={segment.color}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
                strokeWidth="16"
              />
            )
          })}
        </g>
      </svg>
      <DonutCenter>
        <strong>62</strong>
        <span>Clusters</span>
      </DonutCenter>
    </DonutWrap>
  )
}

function Legend() {
  return (
    <LegendList>
      {legend.map((item) => (
        <LegendItem key={item.label}>
          <Swatch style={{ background: item.color }} />
          <div>
            <Label $size={15}>{item.value}</Label>
            <Muted>{item.label}</Muted>
          </div>
        </LegendItem>
      ))}
    </LegendList>
  )
}

function AirbyteMark() {
  return (
    <svg
      aria-hidden="true"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <rect
        fill="#615EFF"
        height="24"
        rx="6"
        width="24"
      />
      <path
        d={
          'M5 13.2c1.8-2.4 3.2-2.6 4.8-.4 1.5 2 2.8 2.2 4.4 0 ' +
          '1.4-1.9 2.6-2.1 4.2-.2'
        }
        fill="none"
        stroke="#fff"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <path
        d="M6.2 9.4c1.5-1.5 2.8-1.5 4.2.2"
        fill="none"
        stroke="#fff"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function DagsterMark() {
  return (
    <svg
      aria-hidden="true"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <rect
        fill="#3A2C86"
        height="24"
        rx="6"
        width="24"
      />
      <circle
        cx="8"
        cy="8.5"
        fill="#9B8CFF"
        r="2.1"
      />
      <circle
        cx="16.2"
        cy="9"
        fill="#D7CCFF"
        r="2.1"
      />
      <circle
        cx="12"
        cy="16.2"
        fill="#6D5CFF"
        r="2.3"
      />
      <path
        d="M8 8.5 16.2 9 12 16.2Z"
        fill="none"
        stroke="#E6E0FF"
        strokeWidth="1.1"
      />
    </svg>
  )
}

function AgentMark() {
  return (
    <Mark>
      <PluralLogoIcon
        color="#FFFFFF"
        size={16}
      />
    </Mark>
  )
}

const Row = styled.div({ display: 'flex' })

const Spacer = styled.div({ flex: 1 })

const Label = styled.div<{ $size: number }>(({ theme, $size }) => ({
  color: tk(theme).text,
  fontSize: $size,
  fontWeight: 500,
  letterSpacing: '-0.01em',
  lineHeight: 1.2,
}))

const Muted = styled.div(({ theme }) => ({
  color: tk(theme).muted,
  fontSize: 13,
  lineHeight: 1.2,
  marginTop: 2,
}))

const Presence = styled.div(({ theme }) => ({
  border: `1.5px solid ${tk(theme).faint}`,
  borderRadius: '50%',
  flexShrink: 0,
  height: 28,
  position: 'relative',
  width: 28,
  '&::after': {
    background: tk(theme).text,
    borderRadius: '50%',
    content: '""',
    height: 6,
    left: 9.5,
    position: 'absolute',
    top: 9.5,
    width: 6,
  },
}))

const Prompt = styled.div(({ theme }) => ({
  background: tk(theme).prompt,
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 12,
  color: tk(theme).text,
  flex: 1,
  fontSize: 18,
  fontWeight: 500,
  letterSpacing: '-0.015em',
  lineHeight: 1.3,
  padding: '14px 16px',
}))

const PrepareButton = styled.div({
  alignItems: 'center',
  background: button,
  borderRadius: 12,
  color: '#FFFFFF',
  display: 'inline-flex',
  fontSize: 16,
  fontWeight: 600,
  height: 42,
  padding: '0 18px',
})

const Mark = styled.div(({ theme }) => ({
  alignItems: 'center',
  background: button,
  borderRadius: 12,
  boxShadow: `0 0 0 4px ${tk(theme).ring}, 0 0 0 9px ${tk(theme).ringSoft}`,
  color: '#FFFFFF',
  display: 'inline-flex',
  height: 40,
  justifyContent: 'center',
  width: 40,
}))

const Composer = styled.div(({ theme }) => ({
  background: tk(theme).inner,
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 14,
  marginTop: 18,
  padding: '16px 14px 12px',
}))

const Placeholder = styled.div(({ theme }) => ({
  color: tk(theme).faint,
  fontSize: 16,
  paddingLeft: 4,
}))

const IconButton = styled.span(({ theme }) => ({
  alignItems: 'center',
  color: tk(theme).muted,
  display: 'inline-flex',
  height: 28,
  justifyContent: 'center',
  width: 28,
}))

const ModelButton = styled.span(({ theme }) => ({
  alignItems: 'center',
  color: tk(theme).muted,
  display: 'inline-flex',
  gap: 6,
  marginRight: 8,
}))

const CopilotButton = styled.span(({ theme }) => ({
  alignItems: 'center',
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 10,
  color: tk(theme).text,
  display: 'inline-flex',
  fontSize: 14,
  fontWeight: 500,
  gap: 8,
  height: 34,
  padding: '0 12px',
}))

const DonutWrap = styled.div({
  flexShrink: 0,
  height: 168,
  position: 'relative',
  width: 168,
})

const DonutCenter = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  inset: 0,
  justifyContent: 'center',
  position: 'absolute',
  strong: {
    color: tk(theme).text,
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: '-0.03em',
    lineHeight: 1,
  },
  span: {
    color: tk(theme).muted,
    fontSize: 13,
    marginTop: 4,
  },
}))

const LegendList = styled.div({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: 8,
  minWidth: 0,
})

const LegendItem = styled.div(({ theme }) => ({
  alignItems: 'center',
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 8,
  display: 'flex',
  gap: 10,
  padding: '7px 10px',
}))

const Swatch = styled.span({
  borderRadius: 3,
  flexShrink: 0,
  height: 14,
  width: 14,
})

const PrRow = styled.div(({ theme }) => ({
  alignItems: 'center',
  background: tk(theme).inner,
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 12,
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: 14,
  padding: '10px 10px 10px 12px',
}))

const LogoTile = styled.span(({ theme }) => ({
  alignItems: 'center',
  background: tk(theme).card,
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 8,
  display: 'inline-flex',
  flexShrink: 0,
  height: 28,
  justifyContent: 'center',
  width: 28,
}))

const OpenedChip = styled.span(({ theme }) => ({
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 8,
  color: tk(theme).muted,
  fontSize: 13,
  fontWeight: 500,
  padding: '5px 10px',
}))

const ViewButton = styled.span({
  alignItems: 'center',
  background: button,
  borderRadius: 8,
  color: '#FFFFFF',
  display: 'inline-flex',
  fontSize: 13,
  fontWeight: 600,
  gap: 6,
  height: 30,
  padding: '0 12px',
})

const Stacks = styled.div({
  marginTop: 22,
  position: 'relative',
})

const Insights = styled.div(({ theme }) => ({
  background: tk(theme).card,
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 8,
  color: tk(theme).text,
  fontSize: 12,
  fontWeight: 500,
  padding: '4px 8px',
  position: 'absolute',
  right: 18,
  top: -10,
}))

const StackRow = styled.div(({ theme }) => ({
  alignItems: 'center',
  background: tk(theme).inner,
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 12,
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: 8,
  padding: '10px 12px',
}))

const Repo = styled.div(({ theme }) => ({
  color: tk(theme).faint,
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  fontSize: 11,
  marginTop: 3,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const Status = styled.span<{ $kind: 'Failed' | 'Successful' }>(
  ({ theme, $kind }) => ({
    alignItems: 'center',
    color: $kind === 'Failed' ? tk(theme).failed : tk(theme).success,
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: 13,
    fontWeight: 500,
    gap: 4,
    marginLeft: 8,
  })
)
