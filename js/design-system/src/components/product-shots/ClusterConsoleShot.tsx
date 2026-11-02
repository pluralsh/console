import type { CSSProperties } from 'react'
import styled, { type DefaultTheme, ThemeProvider } from 'styled-components'

import type { ProductShotTheme } from './scenarios'

export const CLUSTER_CONSOLE_WIDTH = 1167
export const CLUSTER_CONSOLE_HEIGHT = 603

export type ClusterConsoleShotProps = {
  theme?: ProductShotTheme
  // Rendered width in px. The shot is laid out at 1167×603 and scaled to fit.
  width?: number
  className?: string
}

const asset = (file: string) =>
  new URL(`./assets/cluster-console/${file}`, import.meta.url).href

const palette = (mode: string) =>
  mode === 'light'
    ? {
        stage: '#F3F4F8',
        fill: '#FFFFFF',
        fill2: '#F4F5F8',
        fill3: '#E6E8EE',
        border: '#E1E3EA',
        border3: '#C9CDD6',
        text: '#1C1F27',
        light: '#5C6370',
        xlight: '#7A8190',
        disabled: '#8B91A0',
        onButton: '#F9FAFA',
        rail: '#ECEEF3',
        shadow: '0 18px 40px rgb(28 36 72 / 0.12)',
        shadowCard: '-16px 16px 28px rgb(28 36 72 / 0.08)',
        mono: 'brightness(0) saturate(100%)',
      }
    : {
        stage: '#1D1F25',
        fill: '#21242C',
        fill2: '#2A2E37',
        fill3: '#383D47',
        border: '#2A2E37',
        border3: '#454954',
        text: '#F1F3F3',
        light: '#C5C9D3',
        xlight: '#A1A5B0',
        disabled: '#747B8B',
        onButton: '#F9FAFA',
        rail: '#1F1F22',
        shadow:
          '4px 12px 16px rgb(14 16 21 / 0.6), 8px 16px 64px rgb(14 16 21 / 0.8)',
        shadowCard: '-19px 19px 44px rgb(0 0 0 / 0.6)',
        mono: 'none',
      }

const tk = (theme: DefaultTheme) => palette(theme.mode)

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

const Frame = styled.div<{ $scale: number }>(({ $scale }) => ({
  height: CLUSTER_CONSOLE_HEIGHT * $scale,
  overflow: 'hidden',
  position: 'relative',
  width: CLUSTER_CONSOLE_WIDTH * $scale,
}))

const Stage = styled.div<{ $scale: number }>(({ theme, $scale }) => ({
  backgroundColor: tk(theme).stage,
  borderRadius: 12,
  color: tk(theme).text,
  fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
  height: CLUSTER_CONSOLE_HEIGHT,
  left: 0,
  overflow: 'hidden',
  position: 'absolute',
  top: 0,
  transform: `scale(${$scale})`,
  transformOrigin: 'top left',
  width: CLUSTER_CONSOLE_WIDTH,
  '*': { boxSizing: 'border-box' },
}))

const Chrome = styled.img<{ $x: number; $y: number }>(({ $x, $y }) => ({
  left: $x,
  position: 'absolute',
  top: $y,
}))

const Dots = styled.div({
  backgroundImage: 'radial-gradient(circle, #454A56 0.7px, transparent 1.15px)',
  backgroundPosition: '-3px -5px',
  backgroundSize: '12px 12px',
  height: 450,
  left: 124,
  opacity: 0.7,
  pointerEvents: 'none',
  position: 'absolute',
  top: 122,
  width: 948,
})

const Fade = styled.div(({ theme }) => ({
  backgroundImage: `linear-gradient(179deg, transparent 46%, ${tk(theme).stage} 83%)`,
  height: 144,
  left: 0,
  pointerEvents: 'none',
  position: 'absolute',
  top: 464,
  width: CLUSTER_CONSOLE_WIDTH,
  zIndex: 6,
}))

const Mark = styled.img<{ $mono?: boolean }>(({ theme, $mono }) => ({
  display: 'block',
  filter: $mono ? tk(theme).mono : undefined,
  flexShrink: 0,
}))

function Icon({
  file,
  height,
  mono = false,
  width,
}: {
  file: string
  height: number
  mono?: boolean
  width: number
}) {
  return (
    <Mark
      $mono={mono}
      alt=""
      draggable={false}
      height={height}
      src={asset(file)}
      width={width}
    />
  )
}

const NavButton = styled.div<{ $active?: boolean; $x: number; $y: number }>(
  ({ theme, $active, $x, $y }) => ({
    alignItems: 'center',
    background: $active ? tk(theme).rail : 'transparent',
    borderRadius: 7.5,
    display: 'flex',
    height: $active ? 45 : 30,
    justifyContent: 'center',
    left: $x,
    opacity: $active ? 0.5 : 1,
    position: 'absolute',
    top: $y,
    width: $active ? 45 : 30,
  })
)

const ClusterCard = styled.section(({ theme }) => ({
  background: tk(theme).fill,
  borderRadius: 8,
  boxShadow: tk(theme).shadowCard,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  left: 134,
  padding: '17px 24px',
  position: 'absolute',
  top: 73,
  zIndex: 1,
}))

const CardTitle = styled.div(({ theme }) => ({
  alignItems: 'center',
  color: tk(theme).text,
  display: 'flex',
  fontSize: 12,
  gap: 6,
  letterSpacing: 0.12,
  lineHeight: 1.2,
}))

const Summary = styled.div(({ theme }) => ({
  alignItems: 'center',
  background: tk(theme).fill2,
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 8,
  display: 'flex',
  gap: 25,
  padding: 12,
}))

const Donut = styled.div({
  height: 172,
  position: 'relative',
  width: 174,
})

const DonutLabel = styled.div({
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  left: '50%',
  position: 'absolute',
  textAlign: 'center',
  top: '50%',
  transform: 'translate(-50%, -54%)',
  zIndex: 1,
})

const DonutValue = styled.span({
  fontSize: 18,
  letterSpacing: 0.18,
  lineHeight: 1.2,
})

const DonutCaption = styled.span(({ theme }) => ({
  color: tk(theme).light,
  fontSize: 10,
  fontWeight: 300,
  letterSpacing: 0.1,
  lineHeight: 1.2,
}))

const Legend = styled.div({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  width: 103,
})

const LegendItem = styled.div(({ theme }) => ({
  border: `0.66px solid ${tk(theme).border3}`,
  borderRadius: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  padding: '5px 5px 6px',
}))

const LegendCount = styled.div({
  alignItems: 'center',
  display: 'flex',
  fontSize: 10,
  gap: 8,
  letterSpacing: 0.1,
  lineHeight: 1.2,
})

const Swatch = styled.span<{ $color: string }>(({ $color }) => ({
  background: $color,
  borderRadius: 2,
  height: 9,
  width: 9,
}))

const LegendName = styled.span(({ theme }) => ({
  color: tk(theme).light,
  fontSize: 10,
  fontWeight: 300,
  letterSpacing: 0.1,
  lineHeight: 1.2,
}))

const Table = styled.div(({ theme }) => ({
  background: tk(theme).fill2,
  border: `1px solid ${tk(theme).border}`,
  borderRadius: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  height: 251,
  overflow: 'hidden',
  padding: 12,
  width: 560,
}))

const columns = '132px 59px 92px 62px 118px'

const TableHead = styled.div(({ theme }) => ({
  background: tk(theme).fill3,
  borderRadius: 9,
  color: tk(theme).text,
  columnGap: 0,
  display: 'grid',
  fontSize: 13,
  fontWeight: 500,
  gridTemplateColumns: columns,
  letterSpacing: 0.13,
  lineHeight: 1.2,
  padding: '14px 8px 14px 18px',
}))

const Rows = styled.div({
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
})

const Row = styled.div({
  alignItems: 'center',
  display: 'grid',
  gridTemplateColumns: columns,
  paddingLeft: 18,
})

const ClusterName = styled.div({
  alignItems: 'center',
  display: 'flex',
  fontSize: 11.5,
  gap: 9,
  letterSpacing: 0.11,
})

const NodeTile = styled.div(({ theme }) => ({
  alignItems: 'center',
  background: tk(theme).fill3,
  borderRadius: 4.5,
  display: 'flex',
  height: 27,
  justifyContent: 'center',
  width: 27,
}))

const Health = styled.span<{ $ok: boolean }>(({ $ok }) => ({
  background: $ok ? 'rgb(127 250 193 / 0.05)' : 'rgb(234 160 169 / 0.05)',
  border: `1px solid ${$ok ? 'rgb(127 250 193 / 0.1)' : 'rgb(234 160 169 / 0.1)'}`,
  borderRadius: 4.5,
  color: $ok ? '#99F5D5' : '#F599A8',
  display: 'inline-flex',
  fontSize: 10.5,
  justifyContent: 'center',
  lineHeight: 1,
  padding: '7px 9px',
  whiteSpace: 'nowrap',
}))

const Version = styled.span(({ theme }) => ({
  color: tk(theme).light,
  fontSize: 10,
  fontWeight: 300,
  letterSpacing: 0.1,
}))

const Status = styled.span(({ theme }) => ({
  alignItems: 'center',
  border: `0.6px solid ${tk(theme).border3}`,
  borderRadius: 4.5,
  color: tk(theme).light,
  display: 'inline-flex',
  fontSize: 10,
  fontWeight: 300,
  gap: 8,
  justifyContent: 'center',
  letterSpacing: 0.1,
  padding: '7px 9px',
  width: 112,
}))

const Ghost = styled.div<{ $h: number; $w: number }>(({ $h, $w }) => ({
  background: '#2A2E37',
  border: '1px solid rgb(255 255 255 / 0.1)',
  borderRadius: 4.5,
  height: $h,
  opacity: 0.1,
  width: $w,
}))

const GhostBar = styled(Ghost)({
  border: 'none',
  borderRadius: 3.6,
  height: 12,
})

const ChatCard = styled.section(({ theme }) => ({
  background: tk(theme).fill,
  border: `0.8px solid ${tk(theme).border}`,
  borderRadius: 8,
  boxShadow: '-18px 18px 21px rgb(14 16 21 / 0.25)',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  left: 516,
  padding: 17,
  position: 'absolute',
  top: 102,
  width: 441,
  zIndex: 3,
}))

const BubbleRow = styled.div<{ $end?: boolean }>(({ $end }) => ({
  alignItems: 'flex-end',
  display: 'flex',
  gap: 12,
  justifyContent: $end ? 'flex-end' : 'flex-start',
  width: '100%',
}))

const Avatar = styled.div<{ $fill?: string }>(({ theme, $fill }) => ({
  alignItems: 'center',
  background: $fill ?? 'transparent',
  border: $fill
    ? 'none'
    : `0.8px solid ${
        theme.mode === 'light'
          ? 'rgb(28 36 72 / 0.16)'
          : 'rgb(255 255 255 / 0.1)'
      }`,
  borderRadius: 999,
  display: 'flex',
  flexShrink: 0,
  height: 24.5,
  justifyContent: 'center',
  position: 'relative',
  width: 24.5,
  ...(!$fill && {
    '&::after': {
      background: theme.mode === 'light' ? '#1C1F27' : '#FFFFFF',
      borderRadius: 999,
      content: '""',
      height: 4.6,
      width: 4.6,
    },
  }),
}))

const Bubble = styled.div<{ $accent?: boolean }>(({ theme, $accent }) => ({
  background: $accent ? '#7B28FF' : 'transparent',
  border: $accent
    ? 'none'
    : `0.8px solid ${
        theme.mode === 'light'
          ? 'rgb(28 36 72 / 0.12)'
          : 'rgb(255 255 255 / 0.1)'
      }`,
  borderRadius: 7.7,
  color: $accent ? '#FFFFFF' : tk(theme).text,
  fontSize: $accent ? 12 : 11.5,
  letterSpacing: 0.12,
  lineHeight: 1.2,
  padding: '9px 15px',
}))

const Ring = styled.div({
  alignItems: 'center',
  border: '1.1px solid rgb(123 40 255 / 0.4)',
  borderRadius: 999,
  display: 'flex',
  height: 43,
  justifyContent: 'center',
  pointerEvents: 'none',
  position: 'absolute',
  right: 7,
  top: 63,
  width: 43,
})

const RingInner = styled.div({
  border: '1.1px solid rgb(123 40 255 / 0.5)',
  borderRadius: 999,
  height: 34,
  width: 34,
})

const Composer = styled.div(({ theme }) => ({
  background: tk(theme).fill2,
  border: `0.8px solid ${tk(theme).border}`,
  borderRadius: 9,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  height: 87,
  justifyContent: 'center',
  padding: 12,
  width: '100%',
}))

const Placeholder = styled.div(({ theme }) => ({
  color: tk(theme).disabled,
  fontSize: 12,
  fontWeight: 300,
  letterSpacing: 0.12,
  paddingLeft: 6,
}))

const ComposerBar = styled.div({
  alignItems: 'center',
  display: 'flex',
  gap: 3,
  width: '100%',
})

const ToolRow = styled.div({
  alignItems: 'center',
  display: 'flex',
  flex: 1,
  gap: 6,
  paddingLeft: 2,
})

const Model = styled.div({
  alignItems: 'center',
  display: 'flex',
  gap: 9,
  paddingRight: 8,
})

const SendButton = styled.div(({ theme }) => ({
  alignItems: 'center',
  border: '0.8px solid rgb(255 255 255 / 0.1)',
  borderRadius: 6,
  color: tk(theme).light,
  display: 'flex',
  fontSize: 11.5,
  fontWeight: 300,
  gap: 4,
  letterSpacing: 0.11,
  padding: '6px 9px',
}))

const AgentChip = styled.aside(({ theme }) => ({
  background: tk(theme).fill,
  border: `0.5px solid ${tk(theme).border}`,
  borderRadius: 8,
  boxShadow: tk(theme).shadow,
  left: 879,
  padding: 18,
  position: 'absolute',
  top: 79,
  width: 244,
  zIndex: 4,
}))

const AgentInner = styled.div(({ theme }) => ({
  alignItems: 'center',
  background: tk(theme).fill2,
  border: `0.8px solid ${tk(theme).border}`,
  borderRadius: 8,
  display: 'flex',
  gap: 7,
  padding: '13px 13px',
}))

const AgentLabel = styled.span(({ theme }) => ({
  color: tk(theme).light,
  fontSize: 11.5,
  fontWeight: 300,
  letterSpacing: 0.11,
}))

function InsightSpark() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="13"
      viewBox="0 0 18.4123 18.4123"
      width="13"
    >
      <path
        d="M11.8444 13.2341C12.2005 13.2341 12.542 13.3756 12.7938 13.6274C13.0455 13.8791 13.187 14.2206 13.187 14.5767C13.187 14.2206 13.3284 13.8791 13.5802 13.6274C13.832 13.3756 14.1735 13.2341 14.5296 13.2341C14.1735 13.2341 13.832 13.0927 13.5802 12.8409C13.3284 12.5891 13.187 12.2476 13.187 11.8916C13.187 12.2476 13.0455 12.5891 12.7938 12.8409C12.542 13.0927 12.2005 13.2341 11.8444 13.2341ZM11.8444 5.17874C12.2005 5.17874 12.542 5.32018 12.7938 5.57196C13.0455 5.82374 13.187 6.16523 13.187 6.5213C13.187 6.16523 13.3284 5.82374 13.5802 5.57196C13.832 5.32018 14.1735 5.17874 14.5296 5.17874C14.1735 5.17874 13.832 5.03729 13.5802 4.78551C13.3284 4.53373 13.187 4.19224 13.187 3.83617C13.187 4.19224 13.0455 4.53373 12.7938 4.78551C12.542 5.03729 12.2005 5.17874 11.8444 5.17874ZM7.14544 13.2341C7.14544 12.1659 7.56979 11.1415 8.32513 10.3861C9.08047 9.63078 10.1049 9.20643 11.1731 9.20643C10.1049 9.20643 9.08047 8.78209 8.32513 8.02675C7.56979 7.27141 7.14544 6.24695 7.14544 5.17874C7.14544 6.24695 6.7211 7.27141 5.96576 8.02675C5.21042 8.78209 4.18596 9.20643 3.11774 9.20643C4.18596 9.20643 5.21042 9.63078 5.96576 10.3861C6.7211 11.1415 7.14544 12.1659 7.14544 13.2341Z"
        fill="#BA8FFF"
        stroke="#BA8FFF"
        strokeLinejoin="round"
        strokeWidth="0.77"
      />
    </svg>
  )
}

const PullCard = styled.section(({ theme }) => ({
  background: tk(theme).fill,
  border: `0.6px solid ${tk(theme).border}`,
  borderRadius: 8,
  boxShadow: tk(theme).shadow,
  display: 'flex',
  flexDirection: 'column',
  gap: 19,
  left: 649,
  padding: 22,
  position: 'absolute',
  top: 311,
  width: 464,
  zIndex: 2,
}))

const SectionLabel = styled.div(({ theme }) => ({
  alignItems: 'center',
  color: tk(theme).text,
  display: 'flex',
  fontSize: 12,
  justifyContent: 'space-between',
  letterSpacing: 0.12,
  width: '100%',
}))

const LabelGroup = styled.div({
  alignItems: 'center',
  display: 'flex',
  gap: 6,
})

const Chevron = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="5"
    viewBox="0 0 10 5"
    width="10"
  >
    <path
      d="M1 4.2L5 0.8L9 4.2"
      stroke="#C5C9D3"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1"
    />
  </svg>
)

const ServiceRow = styled.div(({ theme }) => ({
  alignItems: 'center',
  background: tk(theme).fill2,
  border: `0.6px solid ${tk(theme).border}`,
  borderRadius: 7,
  display: 'flex',
  justifyContent: 'space-between',
  padding: 9,
  width: '100%',
}))

const ServiceName = styled.div({
  alignItems: 'center',
  display: 'flex',
  fontSize: 11,
  gap: 6,
  letterSpacing: 0.11,
})

const LogoTile = styled.div<{ $size?: number }>(({ theme, $size = 28 }) => ({
  alignItems: 'center',
  background: tk(theme).fill3,
  borderRadius: 6,
  display: 'flex',
  height: $size,
  justifyContent: 'center',
  width: $size,
}))

const ServiceActions = styled.div({
  alignItems: 'center',
  display: 'flex',
  gap: 9,
})

const Opened = styled.span(({ theme }) => ({
  border: `0.6px solid ${tk(theme).fill3}`,
  borderRadius: 2.4,
  color: '#99DAFF',
  fontSize: 9.5,
  letterSpacing: 0.4,
  lineHeight: 1.3,
  padding: '2px 6px',
}))

const ViewButton = styled.span(({ theme }) => ({
  alignItems: 'center',
  background: tk(theme).fill3,
  borderRadius: 4,
  color: tk(theme).onButton,
  display: 'inline-flex',
  fontSize: 9.5,
  fontWeight: 600,
  gap: 6,
  letterSpacing: 0.4,
  padding: '3px 10px',
}))

const StackBlock = styled.div({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  position: 'relative',
  width: '100%',
})

const StackList = styled.div(({ theme }) => ({
  background: tk(theme).fill2,
  border: `0.8px solid ${tk(theme).border}`,
  borderRadius: 6,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  width: '100%',
}))

const StackRow = styled.div<{ $rule?: boolean }>(({ theme, $rule }) => ({
  alignItems: 'center',
  background: tk(theme).fill,
  borderBottom: $rule ? `0.8px solid ${tk(theme).border}` : 'none',
  display: 'flex',
  gap: 13,
  padding: 19,
}))

const StackCopy = styled.div({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: 3,
  minWidth: 0,
})

const StackName = styled.span({
  fontSize: 11.5,
  letterSpacing: 0.11,
  lineHeight: 1.2,
})

const Repo = styled.span(({ theme }) => ({
  color: tk(theme).xlight,
  fontSize: 10.4,
  fontWeight: 300,
  letterSpacing: 0.1,
  lineHeight: 1.2,
}))

const StackMeta = styled.div({
  alignItems: 'center',
  display: 'flex',
  gap: 13,
})

const Insight = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  filter: 'drop-shadow(2px 3px 6px rgb(14 16 21 / 0.45))',
  flexDirection: 'column',
  left: 269,
  position: 'absolute',
  top: 8,
  zIndex: 1,
}))

const InsightBody = styled.div(({ theme }) => ({
  background: tk(theme).fill2,
  borderRadius: 2.4,
  color: '#BA8FFF',
  fontSize: 11,
  letterSpacing: 0.11,
  padding: '6px 9px',
}))

const InsightPoint = styled.div(({ theme }) => ({
  borderLeft: '5px solid transparent',
  borderRight: '5px solid transparent',
  borderTop: `4px solid ${tk(theme).fill2}`,
  height: 0,
  width: 0,
}))

const legend = [
  { color: '#17E8A0', label: 'Upgradable', value: '25' },
  { color: '#EB5F7D', label: 'Not upgradable', value: '2' },
  { color: '#17DEE8', label: 'Latest', value: '4' },
  { color: '#9A5EFB', label: 'Compliant', value: '28' },
  { color: '#FFD346', label: 'Non-Compliant', value: '3' },
]

const clusters: {
  aws: string
  health: 'Healthy' | 'Unhealthy'
  icon: string
  iconHeight: number
  iconWidth: number
  name: string
  node: string
  status: string
}[] = [
  {
    aws: 'aws.svg',
    health: 'Healthy',
    icon: 'status-info.svg',
    iconHeight: 11.4,
    iconWidth: 11.4,
    name: 'staging',
    node: 'cluster-node.svg',
    status: 'Upgrade 3/3',
  },
  {
    aws: 'aws-2.svg',
    health: 'Unhealthy',
    icon: 'status-warn.svg',
    iconHeight: 11.4,
    iconWidth: 12.7,
    name: 'production',
    node: 'cluster-node-2.svg',
    status: 'Upgrade 2/3',
  },
  {
    aws: 'aws-3.svg',
    health: 'Healthy',
    icon: 'status-dash.svg',
    iconHeight: 11.4,
    iconWidth: 11.4,
    name: 'dev',
    node: 'cluster-node-3.svg',
    status: 'Upgrade 0/3',
  },
  {
    aws: 'aws-4.svg',
    health: 'Healthy',
    icon: 'status-dash.svg',
    iconHeight: 11.4,
    iconWidth: 11.4,
    name: 'eu-staging',
    node: 'cluster-node-4.svg',
    status: 'Upgrade 0/3',
  },
]

const repo = 'git@github.com:acme/acme-aws.git'

const stacks: {
  file: string
  height: number
  name: string
  status: 'Failed' | 'Successful'
  width: number
}[] = [
  {
    file: 'airbyte.svg',
    height: 15.8,
    name: 'airbyte',
    status: 'Failed',
    width: 15.8,
  },
  {
    file: 'dagster.svg',
    height: 15.8,
    name: 'dagster',
    status: 'Successful',
    width: 15.8,
  },
  {
    file: 'grafana.png',
    height: 12.6,
    name: 'grafana',
    status: 'Successful',
    width: 12.6,
  },
]

const piece = (file: string, style: CSSProperties) => (
  <img
    alt=""
    draggable={false}
    src={asset(file)}
    style={{ display: 'block', position: 'absolute', ...style }}
  />
)

function DonutChart() {
  return (
    <Donut>
      {piece('donut-a.svg', { left: 0, top: 0 })}
      <div
        style={{
          bottom: '17.82%',
          left: '17.82%',
          position: 'absolute',
          right: '17.82%',
          top: '17.82%',
        }}
      >
        {piece('donut-b.svg', { left: 0, top: 0 })}
      </div>
      <div
        style={{
          inset: 0,
          position: 'absolute',
          transform: 'rotate(180deg)',
        }}
      >
        {piece('donut-c.svg', { left: '20.01%', top: '80.17%' })}
      </div>
      <div
        style={{
          bottom: 0,
          left: '50%',
          position: 'absolute',
          top: '10.73%',
          transform: 'translateX(-50%) rotate(180deg)',
          width: 174,
        }}
      >
        {piece('donut-d.svg', { left: 0, top: 0 })}
      </div>
      <div
        style={{
          bottom: '17.82%',
          left: '50%',
          position: 'absolute',
          top: '17.82%',
          transform: 'translateX(-50%) rotate(180deg)',
          width: 112,
        }}
      >
        {piece('donut-e.svg', { left: 0, top: 0 })}
      </div>
      <DonutLabel>
        <DonutValue>62</DonutValue>
        <DonutCaption>Clusters</DonutCaption>
      </DonutLabel>
    </Donut>
  )
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2].map((row) => (
        <Row key={row}>
          <ClusterName>
            <Ghost
              $h={27}
              $w={27}
            />
            <GhostBar
              $h={12}
              $w={60}
            />
          </ClusterName>
          <Ghost
            $h={27}
            $w={27}
          />
          <Ghost
            $h={27}
            $w={73}
          />
          <GhostBar
            $h={12}
            $w={34}
          />
          <Ghost
            $h={27}
            $w={73}
          />
        </Row>
      ))}
    </>
  )
}

function StackStatus({ status }: { status: 'Failed' | 'Successful' }) {
  return <Health $ok={status === 'Successful'}>{status}</Health>
}

function Rail() {
  return (
    <>
      <Chrome
        $x={35}
        $y={48}
        alt=""
        draggable={false}
        src={asset('window.svg')}
      />
      <Chrome
        $x={35}
        $y={108}
        alt=""
        draggable={false}
        src={asset('rule-h.svg')}
      />
      <Chrome
        $x={57}
        $y={48}
        alt=""
        draggable={false}
        src={asset('rule-v.svg')}
      />
      <Chrome
        $x={64}
        $y={68}
        alt=""
        draggable={false}
        src={asset('logo.svg')}
        style={{ filter: 'var(--console-mono, none)' }}
      />
      {(
        [
          ['home.svg', 58, 140, false],
          ['git-compare.svg', 58, 200, true],
          ['stacks-nav.svg', 58, 260, false],
        ] as const
      ).map(([file, x, y, turn]) => (
        <NavButton
          $x={x}
          $y={y}
          key={file}
        >
          <span
            style={{
              display: 'flex',
              transform: turn ? 'rotate(90deg)' : undefined,
            }}
          >
            <Icon
              file={file}
              height={22.5}
              mono
              width={22.5}
            />
          </span>
        </NavButton>
      ))}
      <NavButton
        $active
        $x={50}
        $y={320}
      >
        <Icon
          file="sparkles.svg"
          height={22.5}
          mono
          width={22.5}
        />
      </NavButton>
    </>
  )
}

function Overview() {
  return (
    <ClusterCard>
      <CardTitle>
        <Icon
          file="grid.svg"
          height={13}
          mono
          width={13}
        />
        Cluster Overview
      </CardTitle>
      <Summary>
        <DonutChart />
        <Legend>
          {legend.map((item) => (
            <LegendItem key={item.label}>
              <LegendCount>
                <Swatch $color={item.color} />
                {item.value}
              </LegendCount>
              <LegendName>{item.label}</LegendName>
            </LegendItem>
          ))}
        </Legend>
      </Summary>
      <Table>
        <TableHead>
          <span>Cluster</span>
          <span>Cloud</span>
          <span>Health</span>
          <span>Version</span>
          <span>Status</span>
        </TableHead>
        <Rows>
          {clusters.map((cluster) => (
            <Row key={cluster.name}>
              <ClusterName>
                <NodeTile>
                  <Icon
                    file={cluster.node}
                    height={13.6}
                    mono
                    width={13.6}
                  />
                </NodeTile>
                {cluster.name}
              </ClusterName>
              <Icon
                file={cluster.aws}
                height={27.3}
                width={27.3}
              />
              <Health $ok={cluster.health === 'Healthy'}>
                {cluster.health}
              </Health>
              <Version>{'v1.26.7'}</Version>
              <Status>
                <Icon
                  file={cluster.icon}
                  height={cluster.iconHeight}
                  width={cluster.iconWidth}
                />
                {cluster.status}
              </Status>
            </Row>
          ))}
          <SkeletonRows />
        </Rows>
      </Table>
    </ClusterCard>
  )
}

function Chat() {
  return (
    <ChatCard>
      <BubbleRow>
        <Avatar />
        <Bubble>Double the size of the elasticsearch cluster</Bubble>
      </BubbleRow>
      <BubbleRow $end>
        <Bubble $accent>Preparing PR...</Bubble>
        <Avatar $fill="#7B28FF">
          <Icon
            file="agent-logo.svg"
            height={9.2}
            width={9.2}
          />
        </Avatar>
      </BubbleRow>
      <Composer>
        <Placeholder>How can I help?</Placeholder>
        <ComposerBar>
          <ToolRow>
            <Icon
              file="plus.svg"
              height={9.2}
              mono
              width={9.2}
            />
            <Icon
              file="sparkles-sm.svg"
              height={18.4}
              mono
              width={18.4}
            />
          </ToolRow>
          <Model>
            <Icon
              file="aws-tile.svg"
              height={30.7}
              width={30.7}
            />
            <Icon
              file="caret.svg"
              height={12.3}
              mono
              width={12.3}
            />
          </Model>
          <SendButton>
            Copilot Agent
            <Icon
              file="send.svg"
              height={18.4}
              mono
              width={18.4}
            />
          </SendButton>
        </ComposerBar>
      </Composer>
      <Ring>
        <RingInner />
      </Ring>
    </ChatCard>
  )
}

function LoaderMark() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="13"
      viewBox="0 0 16 16"
      width="13"
    >
      <path
        d="M8 1.1v3.2M8 11.7v3.2M1.1 8h3.2M11.7 8h3.2M3.15 3.15l2.25 2.25M10.6 10.6l2.25 2.25M12.85 3.15l-2.25 2.25M5.4 10.6l-2.25 2.25"
        stroke="#C5C9D3"
        strokeLinecap="round"
        strokeWidth="1.35"
      />
    </svg>
  )
}

function Agent() {
  return (
    <AgentChip>
      <AgentInner>
        <LoaderMark />
        <AgentLabel>Starting background agent</AgentLabel>
      </AgentInner>
    </AgentChip>
  )
}

function PullRequest() {
  return (
    <PullCard>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          width: '100%',
        }}
      >
        <SectionLabel>
          <LabelGroup>
            <Icon
              file="pr.svg"
              height={7.9}
              width={8.4}
            />
            Pull request
          </LabelGroup>
          <Chevron />
        </SectionLabel>
        <ServiceRow>
          <ServiceName>
            <LogoTile>
              <Icon
                file="elastic.png"
                height={12.6}
                width={12.6}
              />
            </LogoTile>
            elasticsearch
          </ServiceName>
          <ServiceActions>
            <Opened>Opened</Opened>
            <ViewButton>
              <Icon
                file="view.svg"
                height={11.3}
                width={12.6}
              />
              View
            </ViewButton>
          </ServiceActions>
        </ServiceRow>
      </div>
      <StackBlock>
        <SectionLabel>
          <LabelGroup>
            <Icon
              file="stack.svg"
              height={7.9}
              width={7.3}
            />
            Stacks
          </LabelGroup>
          <Chevron />
        </SectionLabel>
        <StackList>
          {stacks.map((stack, index) => (
            <StackRow
              $rule={index < stacks.length - 1}
              key={stack.name}
            >
              <LogoTile>
                <Icon
                  file={stack.file}
                  height={stack.height}
                  width={stack.width}
                />
              </LogoTile>
              <StackCopy>
                <StackName>{stack.name}</StackName>
                <Repo>{repo}</Repo>
              </StackCopy>
              <StackMeta>
                {stack.status === 'Failed' ? <InsightSpark /> : null}
                <StackStatus status={stack.status} />
              </StackMeta>
            </StackRow>
          ))}
        </StackList>
        <Insight>
          <InsightBody>AI Insights</InsightBody>
          <InsightPoint />
        </Insight>
      </StackBlock>
    </PullCard>
  )
}

export function ClusterConsoleShot({
  theme = 'dark',
  width = CLUSTER_CONSOLE_WIDTH,
  className,
}: ClusterConsoleShotProps) {
  const scale = width / CLUSTER_CONSOLE_WIDTH

  return (
    <ThemeProvider theme={shotTheme(theme)}>
      <Frame
        $scale={scale}
        className={className}
      >
        <Stage
          $scale={scale}
          data-cluster-console-shot=""
          data-theme={theme}
          style={{ ['--console-mono' as string]: palette(theme).mono }}
        >
          <Dots />
          <Rail />
          <Overview />
          <PullRequest />
          <Chat />
          <Agent />
          <Fade />
        </Stage>
      </Frame>
    </ThemeProvider>
  )
}
