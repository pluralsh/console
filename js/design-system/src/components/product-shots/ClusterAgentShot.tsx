import type { ReactNode } from 'react'
import styled, { type DefaultTheme, ThemeProvider } from 'styled-components'

import AppsIcon from '../icons/AppsIcon'
import CaretDownIcon from '../icons/CaretDownIcon'
import ElasticsearchLogoIcon from '../icons/ElasticsearchLogoIcon'
import GitPullIcon from '../icons/GitPullIcon'
import GrafanaLogoIcon from '../icons/GrafanaLogoIcon'
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
        <BurstIcon />
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
            <PlusMark />
          </IconButton>
          <IconButton>
            <SparkleIcon dot />
          </IconButton>
          <Spacer />
          <ModelButton>
            <AwsBadge />
            <CaretDownIcon size={10} />
          </ModelButton>
          <CopilotButton>
            Copilot Agent
            <PlayMark />
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
        <AppsIcon size={14} />
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
            <EyeMark />
            View
          </ViewButton>
        </Row>
      </PrRow>
      <Stacks>
        <Insights>AI Insights</Insights>
        <Row style={{ alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <LayersIcon />
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
              {stack.status === 'Failed' && <SparkleIcon color="#9EC4FF" />}
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
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path
        d="M4 18.5C4 8.5 20 8.5 20 18.5"
        fill="none"
        stroke="#8B8CFF"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M7.2 18.5c0-6.2 9.6-6.2 9.6 0"
        fill="none"
        stroke="#8B8CFF"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M10.2 18.5c0-3.2 3.6-3.2 3.6 0"
        fill="none"
        stroke="#8B8CFF"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M12 14.6v4.2"
        fill="none"
        stroke="#8B8CFF"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function DagsterMark() {
  return (
    <svg
      aria-hidden="true"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <circle
        cx="12"
        cy="12"
        fill="#514CFF"
        r="7.2"
      />
      <circle
        cx="9.3"
        cy="9"
        fill="#F7F8FF"
        r="2"
      />
      <path
        d="M6.6 13.6c2.2 2.4 6.4 2.8 9.2.5"
        fill="none"
        stroke="#C9CCFF"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function AgentMark() {
  return (
    <svg
      aria-hidden="true"
      height="58"
      viewBox="0 0 58 58"
      width="58"
    >
      <circle
        cx="29"
        cy="29"
        fill="none"
        r="26"
        stroke="#6E4AD8"
        strokeWidth="1.4"
      />
      <circle
        cx="29"
        cy="29"
        fill="none"
        r="20.5"
        stroke="#8B62F0"
        strokeWidth="1.6"
      />
      <circle
        cx="29"
        cy="29"
        fill={button}
        r="15"
      />
      <rect
        fill="none"
        height="12"
        rx="1.6"
        stroke="#FFFFFF"
        strokeWidth="1.7"
        width="12"
        x="22.2"
        y="22.4"
      />
      <rect
        fill="#FFFFFF"
        height="4.6"
        rx="0.6"
        width="4.6"
        x="26.6"
        y="26.8"
      />
    </svg>
  )
}

function BurstIcon() {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315]

  return (
    <svg
      aria-hidden="true"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      {rays.map((angle) => (
        <line
          key={angle}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.4"
          transform={`rotate(${angle} 8 8)`}
          x1="8"
          x2="8"
          y1="1.4"
          y2="4.3"
        />
      ))}
    </svg>
  )
}

function SparkleIcon({ dot = false, color = 'currentColor' }) {
  return (
    <svg
      aria-hidden="true"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <path
        d="M8 1.4 10.1 5.9 14.6 8 10.1 10.1 8 14.6 5.9 10.1 1.4 8 5.9 5.9Z"
        fill={color}
      />
      {dot && (
        <rect
          fill={color}
          height="2.2"
          rx="0.3"
          width="2.2"
          x="12.4"
          y="12.2"
        />
      )}
    </svg>
  )
}

function PlusMark() {
  return (
    <svg
      aria-hidden="true"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <path
        d="M8 2.5v11M2.5 8h11"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  )
}

function PlayMark() {
  return (
    <svg
      aria-hidden="true"
      height="12"
      viewBox="0 0 12 12"
      width="12"
    >
      <path
        d="M3.2 1.8 10 6 3.2 10.2Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.3"
      />
    </svg>
  )
}

function EyeMark() {
  return (
    <svg
      aria-hidden="true"
      height="14"
      viewBox="0 0 16 16"
      width="14"
    >
      <path
        d="M1.5 8s2.6-4 6.5-4 6.5 4 6.5 4-2.6 4-6.5 4S1.5 8 1.5 8Z"
        fill="none"
        stroke="#FFFFFF"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
      <circle
        cx="8"
        cy="8"
        fill="#FFFFFF"
        r="1.7"
      />
    </svg>
  )
}

function LayersIcon() {
  return (
    <svg
      aria-hidden="true"
      height="14"
      viewBox="0 0 16 16"
      width="14"
    >
      <path
        d="M8 1.6 14.2 4.8 8 8 1.8 4.8Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
      <path
        d="M1.8 8 8 11.2 14.2 8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
      <path
        d="M1.8 11.1 8 14.3 14.2 11.1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  )
}

function AwsBadge() {
  return (
    <AwsTile>
      <svg
        aria-hidden="true"
        height="22"
        viewBox="0 0 28 22"
        width="28"
      >
        <text
          fill="currentColor"
          fontFamily="Inter, Helvetica, Arial, sans-serif"
          fontSize="9"
          fontWeight="700"
          textAnchor="middle"
          x="14"
          y="10"
        >
          aws
        </text>
        <path
          d="M5 14.2c3.2 2.4 14.6 2.4 17.6 0"
          fill="none"
          stroke="#FF9900"
          strokeLinecap="round"
          strokeWidth="1.4"
        />
        <path
          d="m20.2 13.2 3.2 1.6-2.6 1.5"
          fill="#FF9900"
        />
      </svg>
    </AwsTile>
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

const AwsTile = styled.span(({ theme }) => ({
  alignItems: 'center',
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 8,
  color: tk(theme).text,
  display: 'inline-flex',
  height: 32,
  justifyContent: 'center',
  width: 34,
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
    border: $kind === 'Failed' ? `1px solid ${tk(theme).border}` : 0,
    borderRadius: 8,
    color: $kind === 'Failed' ? tk(theme).failed : tk(theme).success,
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: 13,
    fontWeight: 500,
    gap: 5,
    marginLeft: 8,
    padding: $kind === 'Failed' ? '4px 8px' : 0,
  })
)
